import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, CreditCard, IdCard, BookCopy, Building2,
  GraduationCap, Printer, Mail, MapPin, Clock,
  ChevronRight, CheckCircle2, AlertCircle, X, Loader2, Clock3,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRegBackend, postRegBackend } from '@/lib/backendApi';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: number;
  name: string;
  description: string;
  category: string;
  fee: number;
  processing_time: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

interface OfficeLocation {
  id: number;
  name: string;
  building: string;
  room: string;
  hours: string;
}

interface ServiceRequest {
  id: number;
  student_id: string;
  student_name: string;
  service_id: number;
  service_name: string;
  status: string;
  notes: string;
  created_at: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  FileText, CreditCard, IdCard, BookCopy, Building2,
  GraduationCap, Printer, Mail,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock3 },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  READY: { label: 'Ready for Pickup', color: 'bg-green-100 text-green-800', icon: Package },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: X },
};

function unwrap<T>(data: any): T {
  if (data && typeof data === 'object' && 'data' in data && 'status' in data) {
    return data.data as T;
  }
  return data as T;
}

export function ServicesTab() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState<Service | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const studentId = localStorage.getItem('user_id') || '';
  const studentName = localStorage.getItem('user_name') || studentId;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, oRes, rRes] = await Promise.all([
        getRegBackend<any>('/api/university-services/?active=true'),
        getRegBackend<any>('/api/office-locations/'),
        studentId ? getRegBackend<any>(`/api/service-requests/?student_id=${studentId}`) : Promise.resolve([]),
      ]);
      setServices(unwrap<Service[]>(sRes));
      setOffices(unwrap<OfficeLocation[]>(oRes));
      setMyRequests(unwrap<ServiceRequest[]>(rRes));
    } catch (err) {
      console.error('Failed to load services', err);
      toast({
        title: 'Error',
        description: 'Failed to load university services. Using offline data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestModal) return;
    setSubmitting(true);
    try {
      await postRegBackend<any>('/api/service-requests/', {
        student_id: studentId,
        student_name: studentName,
        service_id: requestModal.id,
        notes: requestNotes,
      });
      toast({
        title: 'Request Submitted',
        description: `Your request for ${requestModal.name} has been submitted. You will be notified when it is ready.`,
      });
      setRequestModal(null);
      setRequestNotes('');
      fetchData();
    } catch (err) {
      toast({
        title: 'Request Failed',
        description: 'Could not submit your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const requestedServiceIds = new Set(myRequests.map((r) => r.service_id));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="browse" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Card className="bg-gradient-to-r from-accent/10 via-transparent to-primary/10 w-full sm:w-auto sm:flex-1">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                    <Printer className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">University Services</h3>
                    <p className="text-sm text-muted-foreground">Request documents and official letters</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-sm">
                  {services.length} Service{services.length !== 1 ? 's' : ''} Available
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="browse" className="gap-2">
            <FileText className="h-4 w-4" />
            Browse Services
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Clock className="h-4 w-4" />
            My Requests ({myRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading services...
            </div>
          ) : (
            <>
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category} className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {category}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryServices.map((service, i) => {
                      const IconComp = ICON_MAP[service.icon] || FileText;
                      const alreadyRequested = requestedServiceIds.has(service.id);
                      return (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Card className="h-full hover:shadow-lg transition-shadow group">
                            <CardContent className="pt-6 h-full flex flex-col">
                              <div className="flex items-start justify-between mb-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <IconComp className="h-6 w-6 text-primary" />
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  UGX {service.fee?.toLocaleString()}
                                </Badge>
                              </div>
                              <h4 className="font-semibold mb-2">{service.name}</h4>
                              <p className="text-sm text-muted-foreground mb-4 flex-grow">{service.description}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                                <Clock className="h-3 w-3" />
                                {service.processing_time}
                              </div>
                              {alreadyRequested ? (
                                <Button variant="secondary" className="w-full gap-2" disabled>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Already Requested
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => setRequestModal(service)}
                                  className="w-full gap-2"
                                >
                                  Request Service
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {services.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No services are currently available.
                </div>
              )}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary" />
                Office Locations
              </CardTitle>
              <CardDescription>Where to collect your documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {offices.map((office, i) => (
                  <motion.div
                    key={office.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                      <Building2 className="h-5 w-5 text-secondary" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{office.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {office.building} &bull; {office.room}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {office.hours}
                    </div>
                  </motion.div>
                ))}
                {offices.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-3 text-center py-4">
                    No office locations configured.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Important Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>&bull; Payment must be completed before document processing begins</li>
                    <li>&bull; Bring your student ID when collecting documents</li>
                    <li>&bull; Processing times may vary during peak periods</li>
                    <li>&bull; Contact the relevant office for express processing options</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>You haven't made any service requests yet.</p>
                <p className="text-sm mt-1">Browse available services to make your first request.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req, i) => {
                const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusCfg.icon;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{req.service_name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Requested {req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}
                                {req.notes && ` &bull; ${req.notes}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`${statusCfg.color} gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!requestModal} onOpenChange={(open) => { if (!open) setRequestModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Service</DialogTitle>
            <DialogDescription>
              You are requesting the following service. A PRN will be generated for payment.
            </DialogDescription>
          </DialogHeader>
          {requestModal && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{requestModal.name}</h4>
                  <Badge variant="secondary">UGX {requestModal.fee?.toLocaleString()}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{requestModal.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {requestModal.processing_time}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-notes">Additional Notes (optional)</Label>
                <Input
                  id="request-notes"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Any special instructions or details..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Request
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
