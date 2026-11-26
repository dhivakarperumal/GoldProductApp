import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pdf from 'react-native-pdf';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import { CustomDropdown, errorMessage } from './FormControls';
import LoanDateRangeFilter from './LoanDateRangeFilter';

type KycStatus =
  | 'pending'
  | 'in_review'
  | 'verified'
  | 'rejected'
  | 'resubmission_required'
  | 'failed';

type KycDocument = {
  id: number | string;
  document_type: string;
  mime_type: string;
  file_size: number;
  uploaded_at?: string;
};

type AuditEntry = {
  id: number | string;
  actor_name?: string;
  action: string;
  new_status?: KycStatus | null;
  reason?: string | null;
  created_at?: string;
};

type Application = {
  id: number | string;
  user_id?: number | string;
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
  status: KycStatus;
  provider?: string;
  consent_version?: string;
  consented_at?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_reason?: string | null;
  created_at?: string;
  documents?: KycDocument[];
  audit?: AuditEntry[];
};

type DateRange = { startDate: string; endDate: string };
type KycStats = Partial<Record<KycStatus, number>>;

const PAGE_SIZE = 15;
const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resubmission_required', label: 'Changes requested' },
  { value: 'failed', label: 'Failed' },
];
const STATUS_LABELS: Record<KycStatus, string> = {
  pending: 'Pending',
  in_review: 'In review',
  verified: 'Verified',
  rejected: 'Rejected',
  resubmission_required: 'Changes requested',
  failed: 'Failed',
};
const DOCUMENT_LABELS: Record<string, string> = {
  passport: 'Passport',
  voter_id: 'Voter ID',
  driving_license: 'Driving licence',
  pan: 'PAN',
  ration_card: 'Ration card',
  aadhaar: 'Aadhaar card',
};
const styles = StyleSheet.create({
  pdfViewer: { flex: 1, width: '100%' },
});

function dateText(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function statusStyle(status: KycStatus) {
  switch (status) {
    case 'verified':
      return 'bg-[#EFF9F5] text-[#07564B]';
    case 'in_review':
      return 'bg-[#EFF6FF] text-[#1D4ED8]';
    case 'rejected':
    case 'failed':
      return 'bg-[#FEF2F2] text-[#B42332]';
    case 'resubmission_required':
      return 'bg-[#FFF8E7] text-[#8A5A00]';
    default:
      return 'bg-[#F3F4F1] text-[#52645F]';
  }
}

function getDocumentUrl(documentId: number | string) {
  return `${API_BASE_URL}/kyc/admin/documents/${documentId}`;
}

export default function KycReview() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<KycStats | null>(null);
  const [allowedDocumentTypes, setAllowedDocumentTypes] = useState<
    string[] | null
  >(null);
  const [statsError, setStatsError] = useState('');
  const [listError, setListError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<KycDocument | null>(
    null,
  );
  const [documentToken, setDocumentToken] = useState('');
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError('');
    api
      .get('/kyc/admin/applications', {
        params: {
          search: debouncedSearch,
          status,
          dateFrom: dateRange.startDate,
          dateTo: dateRange.endDate,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then(({ data }) => {
        if (!Array.isArray(data.applications)) {
          throw new Error(
            'The server returned an invalid KYC application list.',
          );
        }
        if (!active) return;
        const pageCount = Math.max(1, Number(data.pages) || 1);
        setApplications(data.applications as Application[]);
        setPages(pageCount);
        setTotal(Number(data.total) || 0);
        if (page > pageCount) setPage(pageCount);
      })
      .catch(error => {
        if (active) setListError(errorMessage(error));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, status, dateRange, page, listRefreshKey]);

  useEffect(() => {
    let active = true;
    setStatsError('');
    api
      .get('/kyc/admin/stats', {
        params: {
          dateFrom: dateRange.startDate,
          dateTo: dateRange.endDate,
        },
      })
      .then(({ data }) => {
        if (!active) return;
        setStats(data.stats || {});
        setAllowedDocumentTypes(data.allowedDocumentTypes || []);
      })
      .catch(error => {
        if (active) setStatsError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [dateRange, statsRefreshKey]);

  const totalFromStats = useMemo(
    () =>
      stats
        ? Object.values(stats).reduce(
            (sum, count) => sum + (Number(count) || 0),
            0,
          )
        : null,
    [stats],
  );
  const statCards = [
    {
      label: 'Total applications',
      value: statsError ? 'Unavailable' : totalFromStats ?? '—',
      icon: Users,
    },
    {
      label: 'Pending',
      value: statsError ? 'Unavailable' : stats?.pending ?? '—',
      icon: Clock3,
    },
    {
      label: 'In review',
      value: statsError ? 'Unavailable' : stats?.in_review ?? '—',
      icon: ShieldCheck,
    },
    {
      label: 'Verified',
      value: statsError ? 'Unavailable' : stats?.verified ?? '—',
      icon: CheckCircle2,
    },
  ];

  const openApplication = async (id: number | string) => {
    setSelectedId(id);
    setSelected(null);
    setViewingDocument(null);
    setDetailsError('');
    setDetailsLoading(true);
    try {
      const { data } = await api.get(`/kyc/admin/applications/${id}`);
      setSelected(data.application as Application);
      setReason(data.application.review_reason || '');
    } catch (error) {
      setDetailsError(errorMessage(error));
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeApplication = () => {
    if (saving) return;
    setSelectedId(null);
    setSelected(null);
    setViewingDocument(null);
    setDocumentToken('');
    setDocumentError('');
  };

  const openDocument = async (document: KycDocument) => {
    setDocumentError('');
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error(
          'Your session has expired. Sign in again to view KYC documents.',
        );
      }
      setDocumentToken(token);
      setViewingDocument(document);
    } catch (error) {
      showAlert('Could not open document', errorMessage(error), {
        variant: 'error',
      });
    }
  };

  const saveReview = async (
    decision: 'in_review' | 'verified' | 'rejected' | 'resubmission_required',
  ) => {
    if (!selected || saving) return;
    if (
      ['rejected', 'resubmission_required'].includes(decision) &&
      !reason.trim()
    ) {
      showAlert(
        'Reason required',
        'Add a message for the customer before rejecting the application or requesting new documents.',
        { variant: 'warning' },
      );
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch(
        `/kyc/admin/applications/${selected.id}/review`,
        { decision, reason: reason.trim() },
      );
      setSelected(data.application as Application);
      showAlert(
        'KYC review saved',
        'The application review has been updated.',
        {
          variant: 'success',
        },
      );
      setListRefreshKey(key => key + 1);
      setStatsRefreshKey(key => key + 1);
    } catch (error) {
      showAlert('Could not save KYC review', errorMessage(error), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  const changeDateRange = (range: DateRange) => {
    setPage(1);
    setDateRange(range);
  };

  const refresh = () => {
    setRefreshing(true);
    setListRefreshKey(key => key + 1);
    setStatsRefreshKey(key => key + 1);
  };

  const canReview = Boolean(
    selected && ['pending', 'in_review'].includes(selected.status),
  );
  const documentUrl = viewingDocument
    ? getDocumentUrl(viewingDocument.id)
    : '';
  const documentHeaders = { Authorization: `Bearer ${documentToken}` };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#07564B"
          />
        }
      >
        <View className="mb-4 rounded-2xl bg-[#064A41] p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#EAD78A]">
            Loan Management
          </Text>
          <Text className="mt-1 text-xl font-extrabold text-white">
            KYC Review
          </Text>
          <Text className="mt-1 text-xs leading-5 text-white/75">
            Review customer identity documents and record a manual decision.
          </Text>
        </View>

        <View className="mb-3 flex-row flex-wrap gap-2">
          {statCards.map(({ label, value, icon: Icon }) => (
            <View
              key={label}
              className="min-h-[82px] w-[48%] flex-1 rounded-xl border border-[#ECE7D8] bg-white p-3"
            >
              <Icon size={16} color="#A77B15" />
              <Text className="mt-2 text-[10px] font-semibold text-[#6B7280]">
                {label}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-0.5 text-sm font-extrabold text-[#173F35]"
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
        {statsError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setStatsRefreshKey(key => key + 1)}
            className="mb-3 self-start"
          >
            <Text className="text-xs font-bold text-[#B42332]">
              Statistics unavailable · Retry
            </Text>
          </Pressable>
        ) : null}

        {allowedDocumentTypes?.length === 0 ? (
          <View className="mb-3 rounded-xl border border-[#F2D98B] bg-[#FFF8E7] p-3">
            <Text className="text-sm font-bold text-[#70540D]">
              Customer submissions are disabled
            </Text>
            <Text className="mt-1 text-xs leading-5 text-[#70540D]">
              No approved KYC document types are configured on the server.
            </Text>
          </View>
        ) : null}

        <View className="mb-3 rounded-xl border border-[#E6E9E3] bg-white px-3">
          <TextInput
            accessibilityLabel="Search KYC applications"
            value={search}
            onChangeText={value => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search name, email, phone or application ID"
            placeholderTextColor="#9AA6A1"
            className="min-h-12 text-sm text-[#173F35]"
          />
        </View>
        <LoanDateRangeFilter onApply={changeDateRange} />
        <CustomDropdown
          label="Application Status"
          value={status}
          options={STATUS_OPTIONS}
          onSelect={changeStatus}
        />

        {listError ? (
          <View className="mb-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-sm text-[#991B1B]">{listError}</Text>
            <Pressable onPress={refresh} className="mt-2 self-start">
              <Text className="text-sm font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#07564B" />
            <Text className="mt-2 text-sm text-[#6B7E76]">
              Loading KYC applications...
            </Text>
          </View>
        ) : applications.length ? (
          applications.map((application, index) => (
            <View
              key={String(application.id)}
              className="mb-3 rounded-2xl border border-[#ECE7D8] bg-white p-4"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-[#173F35]">
                    {application.applicant_name || 'Applicant'}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7E76]">
                    Application #{application.id} · S No{' '}
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </Text>
                </View>
                <Text
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle(
                    application.status,
                  )}`}
                >
                  {STATUS_LABELS[application.status] || application.status}
                </Text>
              </View>
              <View className="mt-3 border-t border-[#F1F2EE] pt-3">
                <Text className="text-xs text-[#52645F]">
                  {application.applicant_email || 'Email not provided'}
                </Text>
                <Text className="mt-1 text-xs text-[#52645F]">
                  {application.applicant_phone || 'Phone not provided'}
                </Text>
                <Text className="mt-1 text-[10px] text-[#8A8F8B]">
                  Submitted {dateText(application.created_at)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={refreshing}
                onPress={() => openApplication(application.id)}
                className="mt-3 min-h-10 items-center justify-center rounded-lg bg-[#064A41] px-4 py-2 disabled:opacity-50"
              >
                <Text className="text-xs font-bold text-white">
                  {canReview && selected?.id === application.id
                    ? 'Continue Review'
                    : 'Review'}
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white px-5 py-10">
            <ShieldCheck size={26} color="#A77B15" />
            <Text className="mt-3 text-center text-sm font-bold text-[#173F35]">
              {total
                ? 'No KYC applications match these filters.'
                : 'No KYC applications have been submitted yet.'}
            </Text>
            {!total && !search && status === 'all' ? (
              <Text className="mt-2 text-center text-xs leading-5 text-[#6B7E76]">
                Customer submissions will appear here when they are sent for
                manual review.
              </Text>
            ) : null}
          </View>
        )}

        <View className="mb-3 mt-1 flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
          <Text className="text-xs font-semibold text-[#6B7E76]">
            {total
              ? `Page ${page} of ${pages} · ${total} applications`
              : `Page ${page} of ${pages}`}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous KYC page"
              disabled={page <= 1 || loading}
              onPress={() => setPage(current => current - 1)}
              className="h-9 w-9 items-center justify-center rounded-lg border border-[#D9DED9] disabled:opacity-40"
            >
              <ChevronLeft size={18} color="#52645F" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next KYC page"
              disabled={page >= pages || loading}
              onPress={() => setPage(current => current + 1)}
              className="h-9 w-9 items-center justify-center rounded-lg border border-[#D9DED9] disabled:opacity-40"
            >
              <ChevronRight size={18} color="#52645F" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={selectedId !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (viewingDocument) {
            setViewingDocument(null);
            setDocumentError('');
          } else {
            closeApplication();
          }
        }}
      >
        <View
          style={{
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
          className="flex-1 bg-black/50"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close KYC review"
            disabled={saving}
            onPress={closeApplication}
            className="flex-1"
          />
          <View className="max-h-[92%] flex-1 rounded-t-3xl bg-[#F8F7F2]">
            <View className="flex-row items-center justify-between rounded-t-3xl bg-[#064A41] px-4 py-4">
              {viewingDocument ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to application review"
                  onPress={() => {
                    setViewingDocument(null);
                    setDocumentError('');
                  }}
                  className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white/10"
                >
                  <ChevronLeft size={20} color="#FFFFFF" />
                </Pressable>
              ) : null}
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-[#EAD78A]">
                  {viewingDocument
                    ? 'Private KYC Document'
                    : selected
                    ? `Application #${selected.id}`
                    : 'KYC Review'}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-1 text-base font-extrabold text-white"
                >
                  {viewingDocument
                    ? DOCUMENT_LABELS[viewingDocument.document_type] ||
                      viewingDocument.document_type
                    : selected?.applicant_name || 'Review application'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close review"
                disabled={saving}
                onPress={closeApplication}
                className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-white/10"
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {detailsLoading ? (
              <View className="flex-1 items-center justify-center p-8">
                <ActivityIndicator color="#07564B" />
                <Text className="mt-2 text-sm text-[#6B7E76]">
                  Loading application details...
                </Text>
              </View>
            ) : detailsError && !selected ? (
              <View className="p-5">
                <Text className="text-sm text-[#B42332]">{detailsError}</Text>
                <Pressable
                  onPress={() =>
                    selectedId !== null && openApplication(selectedId)
                  }
                  className="mt-3 self-start"
                >
                  <Text className="font-bold text-[#07564B]">Retry</Text>
                </Pressable>
              </View>
            ) : viewingDocument ? (
              <View className="flex-1 p-3">
                {documentError ? (
                  <View className="mb-3 rounded-xl bg-[#FEF2F2] p-3">
                    <Text className="text-sm text-[#991B1B]">
                      {documentError}
                    </Text>
                  </View>
                ) : null}
                {viewingDocument.mime_type === 'application/pdf' ? (
                  <Pdf
                    source={{
                      uri: documentUrl,
                      headers: documentHeaders,
                      cache: false,
                    }}
                    trustAllCerts={false}
                    onError={error => setDocumentError(errorMessage(error))}
                    onLoadComplete={() => setDocumentError('')}
                    style={styles.pdfViewer}
                  />
                ) : (
                  <Image
                    source={{
                      uri: documentUrl,
                      headers: documentHeaders,
                      cache: 'reload',
                    }}
                    resizeMode="contain"
                    onError={() =>
                      setDocumentError(
                        'Unable to load this private image document.',
                      )
                    }
                    className="flex-1"
                  />
                )}
              </View>
            ) : selected ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="p-4"
                className="shrink"
              >
                <View className="mb-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
                  <View className="flex-row flex-wrap gap-x-4 gap-y-2">
                    <Text className="text-xs text-[#52645F]">
                      Status:{' '}
                      <Text className="font-bold text-[#173F35]">
                        {STATUS_LABELS[selected.status] || selected.status}
                      </Text>
                    </Text>
                    <Text className="text-xs text-[#52645F]">
                      Submitted: {dateText(selected.created_at)}
                    </Text>
                    <Text className="text-xs text-[#52645F]">
                      Consent: {selected.consent_version || '—'}
                    </Text>
                  </View>
                  {selected.reviewed_at ? (
                    <Text className="mt-2 text-xs text-[#52645F]">
                      Reviewed by {selected.reviewer_name || 'admin'} ·{' '}
                      {dateText(selected.reviewed_at)}
                    </Text>
                  ) : null}
                </View>

                <View className="mb-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
                  <Text className="mb-3 text-sm font-extrabold text-[#173F35]">
                    Submitted Documents
                  </Text>
                  {selected.documents?.length ? (
                    selected.documents.map(document => (
                      <View
                        key={String(document.id)}
                        className="mb-2 flex-row items-center justify-between gap-3 rounded-xl border border-[#E6E9E3] p-3"
                      >
                        <View className="flex-1 flex-row items-center">
                          <FileText size={17} color="#07564B" />
                          <View className="ml-2 flex-1">
                            <Text className="text-xs font-bold text-[#173F35]">
                              {DOCUMENT_LABELS[document.document_type] ||
                                document.document_type}
                            </Text>
                            <Text className="mt-1 text-[10px] text-[#6B7E76]">
                              {(document.file_size / 1024).toFixed(0)} KB ·{' '}
                              {document.mime_type === 'application/pdf'
                                ? 'PDF'
                                : document.mime_type
                                    .split('/')[1]
                                    ?.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => openDocument(document)}
                          className="rounded-lg bg-[#EFF9F5] px-3 py-2"
                        >
                          <Text className="text-xs font-bold text-[#07564B]">
                            View securely
                          </Text>
                        </Pressable>
                      </View>
                    ))
                  ) : (
                    <Text className="text-xs text-[#6B7E76]">
                      No documents attached.
                    </Text>
                  )}
                </View>

                {selected.audit?.length ? (
                  <View className="mb-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
                    <Text className="mb-3 text-sm font-extrabold text-[#173F35]">
                      Audit History
                    </Text>
                    {selected.audit.map(entry => (
                      <View
                        key={String(entry.id)}
                        className="mb-3 border-l-2 border-[#A7D6C9] pl-3"
                      >
                        <Text className="text-xs font-bold text-[#173F35]">
                          {entry.action.replaceAll('_', ' ')}
                          {entry.new_status
                            ? ` · ${
                                STATUS_LABELS[entry.new_status] ||
                                entry.new_status
                              }`
                            : ''}
                        </Text>
                        <Text className="mt-1 text-[10px] text-[#6B7E76]">
                          {entry.actor_name || 'System'} ·{' '}
                          {dateText(entry.created_at)}
                        </Text>
                        {entry.reason ? (
                          <Text className="mt-1 text-xs leading-5 text-[#52645F]">
                            {entry.reason}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {canReview ? (
                  <View className="mb-2 rounded-2xl border border-[#ECE7D8] bg-white p-4">
                    <Text className="text-sm font-extrabold text-[#173F35]">
                      Record Manual Review
                    </Text>
                    <Text className="mb-3 mt-1 text-xs leading-5 text-[#6B7E76]">
                      This is an internal shop decision, not government
                      verification or an assessment of document authenticity.
                    </Text>
                    <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">
                      Message to customer
                    </Text>
                    <TextInput
                      accessibilityLabel="KYC review reason"
                      value={reason}
                      onChangeText={setReason}
                      maxLength={2000}
                      multiline
                      textAlignVertical="top"
                      placeholder="A clear reason is required for rejection or requesting new documents."
                      placeholderTextColor="#9AA6A1"
                      className="mb-3 min-h-24 rounded-xl border border-[#E6E9E3] bg-white px-3 py-3 text-sm text-[#173F35]"
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() => saveReview('in_review')}
                      className="mb-2 min-h-11 items-center justify-center rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 disabled:opacity-50"
                    >
                      <Text className="text-xs font-bold text-[#1D4ED8]">
                        Mark In Review
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() => saveReview('verified')}
                      className="mb-2 min-h-11 items-center justify-center rounded-xl bg-[#087568] px-3 py-2 disabled:opacity-50"
                    >
                      <Text className="text-xs font-bold text-white">
                        {saving ? 'Saving...' : 'Verify Manually'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() => saveReview('resubmission_required')}
                      className="mb-2 min-h-11 items-center justify-center rounded-xl border border-[#F2D98B] bg-[#FFF8E7] px-3 py-2 disabled:opacity-50"
                    >
                      <Text className="text-xs font-bold text-[#8A5A00]">
                        Request New Documents
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() => saveReview('rejected')}
                      className="min-h-11 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 disabled:opacity-50"
                    >
                      <Text className="text-xs font-bold text-[#B42332]">
                        Reject Application
                      </Text>
                    </Pressable>
                  </View>
                ) : selected.review_reason ? (
                  <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
                    <Text className="text-sm font-extrabold text-[#173F35]">
                      Review Message
                    </Text>
                    <Text className="mt-2 text-xs leading-5 text-[#52645F]">
                      {selected.review_reason}
                    </Text>
                  </View>
                ) : null}
                <Text className="mb-3 rounded-xl bg-[#FFF8E7] p-3 text-[10px] leading-4 text-[#70540D]">
                  KYC decisions are made manually by authorized staff. Do not
                  treat an application status as government verification.
                </Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
