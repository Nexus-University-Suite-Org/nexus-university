from typing import List, Tuple

import numpy as np


class VectorStore:
    def __init__(self, vectors: np.ndarray):
        self.vectors = np.asarray(vectors, dtype="float32")
        self._faiss_index = None
        self._faiss = None
        self._backend = "numpy"
        self._build()

    def _build(self) -> None:
        try:
            import faiss

            normalized = self.vectors.copy()
            faiss.normalize_L2(normalized)
            index = faiss.IndexFlatIP(self.vectors.shape[1])
            index.add(normalized)
            self._faiss_index = index
            self._faiss = faiss
            self._backend = "faiss"
        except Exception:
            self._faiss_index = None
            self._faiss = None
            self._backend = "numpy"

    @property
    def backend(self) -> str:
        return self._backend

    @property
    def size(self) -> int:
        return int(self.vectors.shape[0])

    def search(self, query_vector: np.ndarray, top_k: int) -> List[Tuple[int, float]]:
        if self.size == 0:
            return []
        top_k = max(1, min(top_k, self.size))
        q = np.asarray([query_vector], dtype="float32")

        if self._faiss_index is not None:
            self._faiss.normalize_L2(q)
            scores, indices = self._faiss_index.search(q, top_k)
            return [
                (int(indices[0][i]), float(scores[0][i]))
                for i in range(top_k)
                if indices[0][i] >= 0
            ]

        q_norm = q / (np.linalg.norm(q, axis=1, keepdims=True) + 1e-9)
        norms = np.linalg.norm(self.vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized = self.vectors / norms
        sims = normalized @ q_norm.T
        flat_sims = sims[:, 0]
        order = np.argsort(-flat_sims)[:top_k]
        return [(int(i), float(flat_sims[i])) for i in order]