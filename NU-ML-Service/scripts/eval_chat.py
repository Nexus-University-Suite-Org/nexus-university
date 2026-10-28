#!/usr/bin/env python
"""Offline QA harness for the NAP chat pipeline (no LLM).

Runs every golden question through the exact functions /api/chat uses
(``retrieve`` -> ``build_answer`` / ``quoted_sources``) against the locally
persisted index, then reports precision-style metrics and diffs them against the
stored baseline so each "intelligence" change is measurable.

Only institution-related questions are ever answered: out-of-scope fixtures must
end in an honest fallback (``should_answer: false``) and are scored against that.

Usage (from the repository root):
    npm run eval:chat
    python NAP-ML-Service/scripts/eval_chat.py            # run + auto-compare
    python NAP-ML-Service/scripts/eval_chat.py --update-baseline
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURES_DEFAULT = ROOT.parent / "e2e-audit" / "chat-fixtures.json"
BASELINE_DEFAULT = ROOT / "scripts" / "eval_baseline.json"

sys.path.insert(0, str(ROOT))
os.environ.setdefault("NAP_BASE_URL", "http://127.0.0.1:8080")

from app.config import TOP_K_DEFAULT  # noqa: E402
from app.models.generator import (  # noqa: E402
    PORTAL_FALLBACK,
    _classify,
    build_answer,
    is_conversational,
    quoted_sources,
)
from app.models.knowledge_base import kb_for  # noqa: E402
from app.services.retrieval import retrieve  # noqa: E402

_FALLBACK_MARKER = "I couldn't find that in our information yet"
_CLARIFY_MARKER = "Happy to help!"

_SMALLTALK_TOPICS = {
    "greeting",
    "thanks",
    "farewell",
    "wellbeing",
    "identity",
    "capability",
}

_TOPIC_TAXONOMY = {
    "program_list",
    "program_detail",
    "fees",
    "scholarships",
    "apply",
    "requirements",
    "deadline",
    "schemes",
    "news",
    "events",
    "stories",
    "contact",
    "campus",
    "eligibility",
}


def _answer_kind(query: str, answer: str, quoted: list) -> str:
    intent = _classify(query)
    if intent in _SMALLTALK_TOPICS:
        return "smalltalk"
    if intent == "contact":
        return "contact"
    text = (answer or "").strip()
    if intent == "catalog":
        return "catalog"
    if text.startswith(_FALLBACK_MARKER) or text == PORTAL_FALLBACK:
        return "fallback"
    if text.startswith(_CLARIFY_MARKER):
        return "clarify"
    if not quoted:
        return "empty"
    return "single" if len(quoted) == 1 else "multi"


def _titles_ok(fixture: dict, quoted_titles: set, expected_titles: list) -> bool:
    if not expected_titles:
        return True
    requirement = fixture.get("require", "any_title")
    if requirement == "all_titles":
        return set(expected_titles) <= quoted_titles
    return bool(quoted_titles & set(expected_titles))


def _contains_ok(fixture: dict, answer: str) -> bool:
    expected = fixture.get("contains") or []
    return all((s or "").lower() in answer.lower() for s in expected)


def _missing_contains(fixture: dict, answer: str) -> list:
    expected = fixture.get("contains") or []
    return [s for s in expected if (s or "").lower() not in answer.lower()]


def _passes(fixture: dict, kind: str, quoted_titles: set, answer: str) -> tuple[bool, list]:
    topic = fixture.get("topic")
    should_answer = bool(fixture.get("should_answer", True))
    expected_titles = fixture.get("titles") or []
    failures: list[str] = []

    if topic in _SMALLTALK_TOPICS:
        if kind != "smalltalk":
            failures.append(f"expected smalltalk, got {kind}")
        return not failures, failures
    if topic == "contact":
        if kind != "contact":
            failures.append(f"expected contact, got {kind}")
        return not failures, failures

    if not should_answer:
        if kind not in ("fallback", "clarify"):
            failures.append(f"answered out of scope as {kind}")
        return not failures, failures

    if kind in ("fallback", "clarify", "empty"):
        failures.append(f"no answer ({kind})")
        return False, failures

    if not _titles_ok(fixture, quoted_titles, expected_titles):
        failures.append("no expected source quoted")
    missing = _missing_contains(fixture, answer)
    if missing:
        failures.append(f"missing: {missing}")
    return not failures, failures


def _load_classifier():
    try:
        module = importlib.import_module("app.utils.intent")
        fn = module.classify_topics
    except (ImportError, AttributeError):
        return None
    return fn


def _primary_topic(fn, query: str):
    try:
        result = fn(query)
    except Exception:
        return None
    if isinstance(result, dict):
        return result.get("primary")
    if isinstance(result, (list, tuple)) and result:
        return result[0]
    return None


def _run_fixture(fixture: dict, classify) -> dict:
    query = fixture["question"]
    if is_conversational(query):
        hits = []
    else:
        hits = retrieve(query, TOP_K_DEFAULT, None)
    answer = build_answer(query, hits, tenant=None)
    quoted = quoted_sources(query, hits, tenant=None)
    quoted_titles = {s.get("title") or "" for s in quoted}
    kind = _answer_kind(query, answer, quoted)
    ok, failures = _passes(fixture, kind, quoted_titles, answer)

    result = {
        "id": fixture["id"],
        "topic": fixture.get("topic"),
        "should_answer": bool(fixture.get("should_answer", True)),
        "ok": ok,
        "kind": kind,
        "quoted": sorted(t for t in quoted_titles if t),
        "failures": failures,
        "answer": answer,
    }
    if classify and fixture.get("topic") in _TOPIC_TAXONOMY:
        result["got_topic"] = _primary_topic(classify, query)
    return result


def _fmt(v) -> str:
    if v is None:
        return "n/a"
    return f"{v:.1%}" if isinstance(v, float) else str(v)


def _median(values) -> float | None:
    return statistics.median(values) if values else None


def evaluate(fixtures: list, classify) -> tuple[dict, list[list[str]]]:
    results = [ _run_fixture(fx, classify) for fx in fixtures ]
    ok_by_id = {r["id"]: r["ok"] for r in results}

    pass_rate = sum(r["ok"] for r in results) / len(results)

    retrieval_expect = [
        r for r in results
        if r["should_answer"] and r["topic"] not in _SMALLTALK_TOPICS
        and r["topic"] != "contact"
    ]
    fallback_count = sum(
        1 for r in retrieval_expect if r["kind"] in ("fallback", "clarify", "empty")
    )
    fallback_rate = fallback_count / len(retrieval_expect) if retrieval_expect else None

    out_of_scope = [r for r in results if not r["should_answer"]]
    overreach = sum(1 for r in out_of_scope if not r["ok"])
    overreach_rate = overreach / len(out_of_scope) if out_of_scope else None

    title_recalls = []
    contains_rates = []
    topic_hits = 0
    topic_total = 0
    for fx, r in zip(fixtures, results):
        expected = fx.get("titles") or []
        if expected and r["kind"] != "smalltalk" and r["topic"] != "contact":
            hit = len(set(expected) & set(r["quoted"]))
            title_recalls.append(hit / len(expected))
        if fx.get("contains"):
            contains_rates.append(float(r["ok"]))
        if r.get("got_topic") is not None:
            topic_total += 1
            if r["got_topic"] == r["topic"]:
                topic_hits += 1

    source_counts = [
        len(r["quoted"])
        for r in results
        if r["kind"] in ("single", "multi", "catalog")
    ]
    answer_lengths = [len(r["answer"]) for r in results]

    kinds = {}
    for r in results:
        kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1

    report = {
        "schema": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n": len(results),
        "passed": int(sum(r["ok"] for r in results)),
        "pass_rate": pass_rate,
        "fallback_rate": fallback_rate,
        "overreach_rate": overreach_rate,
        "title_recall": statistics.mean(title_recalls) if title_recalls else None,
        "contains_rate": statistics.mean(contains_rates) if contains_rates else None,
        "topic_precision": topic_hits / topic_total if topic_total else None,
        "source_stats": {
            "min": min(source_counts) if source_counts else 0,
            "median": _median(source_counts),
            "p95": sorted(source_counts)[int(0.95 * len(source_counts))] if source_counts else 0,
            "max": max(source_counts) if source_counts else 0,
        },
        "answer_len": {
            "min": min(answer_lengths) if answer_lengths else 0,
            "median": _median(answer_lengths),
            "p95": sorted(answer_lengths)[int(0.95 * len(answer_lengths))] if answer_lengths else 0,
            "max": max(answer_lengths) if answer_lengths else 0,
        },
        "kind_counts": kinds,
        "fixtures": results,
    }

    lines: list[list[str]] = []
    for fx, r in zip(fixtures, results):
        lines.append([fx["id"], r["topic"], "pass" if r["ok"] else "FAIL", r["kind"], r["failures"]])
    return report, lines


def _print_metrics(report: dict) -> None:
    print(f"pass rate         {report['passed']}/{report['n']} ({report['pass_rate']:.1%})")
    print(f"fallback rate     {_fmt(report['fallback_rate'])}")
    print(f"overreach rate    {_fmt(report['overreach_rate'])}  (out-of-scope wrongly answered)")
    print(f"title recall      {_fmt(report['title_recall'])}")
    print(f"contains rate     {_fmt(report['contains_rate'])}")
    print(f"topic precision   {_fmt(report['topic_precision'])}")
    print(
        "sources           "
        f"min {report['source_stats']['min']} / "
        f"median {report['source_stats']['median']} / "
        f"p95 {report['source_stats']['p95']} / "
        f"max {report['source_stats']['max']}"
    )
    print(
        "answer len        "
        f"min {report['answer_len']['min']} / "
        f"median {report['answer_len']['median']} / "
        f"p95 {report['answer_len']['p95']} / "
        f"max {report['answer_len']['max']}"
    )
    print("kinds             " + ", ".join(f"{k}={v}" for k, v in sorted(report["kind_counts"].items())))


def _print_fixture_lines(lines: list[list[str]]) -> None:
    width = max(len(row[0]) for row in lines)
    for row in lines:
        status = "PASS" if row[2] == "pass" else "FAIL"
        detail = f" ({', '.join(row[4])})" if row[4] else ""
        print(f"  {row[0].ljust(width)}  {status:4}  {row[1]:<12}  -> {row[3]}{detail}")


def _compare(baseline: dict, report: dict, lines: list[list[str]]) -> None:
    changed = []
    old = {f["id"]: f["ok"] for f in baseline.get("fixtures", [])}
    new = {f["id"]: f["ok"] for f in report["fixtures"]}
    for fid in sorted(old.keys() | new.keys()):
        before, after = old.get(fid), new.get(fid)
        if before != after:
            changed.append((fid, before, after))

    deltas = []
    for metric in ("pass_rate", "fallback_rate", "overreach_rate", "title_recall", "contains_rate"):
        before, after = baseline.get(metric), report.get(metric)
        if before is None or after is None:
            continue
        if after != before:
            deltas.append(f"{metric} {before:.3f} -> {after:.3f}")

    print(f"baseline diff: {report['passed'] - baseline.get('passed', 0):+d} passing "
          + ("(" + ", ".join(deltas) + ")" if deltas else "(no metric change)"))
    for fid, before, after in changed:
        print(f"  {'+' if after else '-'}{fid}: {'fail' if before is False else 'pass'} -> {'pass' if after else 'fail'}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", default=str(FIXTURES_DEFAULT))
    parser.add_argument("--baseline", default=str(BASELINE_DEFAULT))
    parser.add_argument("--update-baseline", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    fixtures_path = Path(args.fixtures)
    if not fixtures_path.exists():
        print(f"fixtures not found: {fixtures_path}", file=sys.stderr)
        return 1
    fixtures = json.loads(fixtures_path.read_text(encoding="utf-8")).get("fixtures", [])
    if not fixtures:
        print(f"no fixtures in {fixtures_path}", file=sys.stderr)
        return 1

    default_kb = kb_for(None)
    if not default_kb.is_trained():
        print(
            "default knowledge base is not trained (no index at "
            f"{default_kb.index_dir}). Run a train first, e.g.:\n"
            "  python -c \"from app.services.training import train; print(train(None))\"",
            file=sys.stderr,
        )
        return 1

    classify = _load_classifier()
    report, lines = evaluate(fixtures, classify)

    print(f"=== NAP chat eval (n={report['n']}) ===  {fixtures_path.name}")
    _print_metrics(report)

    baseline_path = Path(args.baseline)
    if not args.update_baseline and baseline_path.exists():
        try:
            baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
            _compare(baseline, report, lines)
        except (json.JSONDecodeError, KeyError):
            print(f"(baseline at {baseline_path} unreadable; use --update-baseline)")

    if args.update_baseline:
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        baseline_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"baseline written: {baseline_path}")

    if args.verbose:
        print("\nfixtures:")
        _print_fixture_lines(lines)

    return 1 if report["pass_rate"] < 1.0 else 0


if __name__ == "__main__":
    sys.exit(main())