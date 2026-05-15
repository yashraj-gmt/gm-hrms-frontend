// src/pages/leave/modals/LeaveRequestDetailModal.jsx
 
import { useEffect, useRef, useState } from 'react'
import { X, FileText, Upload, Trash2 } from 'lucide-react'
import leaveService from '@/services/leaveService'
import { useToast }  from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
 
const PRIMARY_D  = '#C35E33'
const BORDER_D   = '#E9C7B8'
const BG_LIGHT_D = '#F9F9F9'
 
const STATUS_MAP_D = {
  APPROVED:            { label: 'Approved',             bg: '#DCFCE7', color: '#15803D' },
  REJECTED:            { label: 'Rejected',             bg: '#FEE2E2', color: '#DC2626' },
  PENDING:             { label: 'Pending',              bg: '#E5E7EB', color: '#374151' },
  CANCELLED:           { label: 'Cancelled',            bg: '#FEF9C3', color: '#854D0E' },
  WAITING_FOR_DOCUMENT:{ label: 'Awaiting Document',   bg: '#DBEAFE', color: '#1E40AF' },
}
 
function Section({ title, children }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ border: `1px solid ${BORDER_D}`, background: BG_LIGHT_D }}>
      <p className="text-xs text-gray-500 mb-2 font-medium">{title}</p>
      {children}
    </div>
  )
}
 
function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-500">{label}</span>
      <span style={{ color: PRIMARY_D }} className="font-medium">{value ?? '—'}</span>
    </div>
  )
}
 
function Divider() {
  return <div className="border-t my-2" style={{ borderColor: '#EFEFEF' }} />
}
 
function Bullet({ text }) {
  return (
    <div className="flex items-center gap-2 text-gray-600 text-sm">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIMARY_D }} />
      {text}
    </div>
  )
}
 
export default function LeaveRequestDetailModal({ record, onClose }) {
  const overlayRef = useRef(null)
  const { user }   = useAuthStore()
  const { toast }  = useToast()
 
  const [documents,   setDocuments]   = useState([])
  const [docLoading,  setDocLoading]  = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [activeTab,   setActiveTab]   = useState('details') // 'details' | 'documents'
 
  const status = STATUS_MAP_D[record.status] ?? { label: record.status, bg: '#F3F4F6', color: '#374151' }
 
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
 
  // Load documents when tab switches
  useEffect(() => {
    if (activeTab !== 'documents' || !record.id) return
    setDocLoading(true)
    leaveService.getDocuments(record.id)
      .then((res) => { if (res.success) setDocuments(res.data ?? []) })
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setDocLoading(false))
  }, [activeTab, record.id])
 
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const res = await leaveService.uploadDocuments(record.id, user?.personalId, files)
      if (res.success) {
        toast.success('Documents uploaded')
        // Reload docs
        const d = await leaveService.getDocuments(record.id)
        if (d.success) setDocuments(d.data ?? [])
      }
    } catch (err) {
      toast.error(err?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }
 
  const handleDeleteDoc = async (docId) => {
    try {
      const res = await leaveService.deleteDocument(docId)
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
        toast.success('Document removed')
      }
    } catch (err) {
      toast.error(err?.message ?? 'Delete failed')
    }
  }
 
  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl w-full overflow-hidden shadow-xl" style={{ maxWidth: 460, margin: '0 16px' }}>
        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center" style={{ background: PRIMARY_D }}>
          <h2 className="text-sm font-semibold text-white">Leave Request Details</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>
 
        {/* Tab switcher */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'details',   label: 'Details'   },
            { key: 'documents', label: 'Documents'  },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all border-b-2"
              style={{
                borderBottomColor: activeTab === key ? PRIMARY_D : 'transparent',
                color:             activeTab === key ? PRIMARY_D : '#6B7280',
              }}>
              {label}
            </button>
          ))}
        </div>
 
        <div className="p-5 space-y-4 text-sm max-h-[65vh] overflow-y-auto">
          {activeTab === 'details' && (
            <>
              {/* Profile row */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: PRIMARY_D }}>
                  {(record.name ?? '?')[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{record.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">
                    {record.employeeCode} · <span style={{ color: PRIMARY_D }}>{record.leaveType ?? record.leaveTypeName}</span>
                  </p>
                </div>
                <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{ background: status.bg, color: status.color }}>
                  {status.label}
                </span>
              </div>
 
              {/* Date Info */}
              <Section title="Date Info">
                <Row label="Start Date"  value={record.startDate}  />
                <Divider />
                <Row label="End Date"    value={record.endDate}    />
                <Divider />
                <Row label="Applied On"  value={record.appliedOn}  />
              </Section>
 
              {/* Duration */}
              <Section title="Duration Summary">
                <Row label="Applied"  value={`${record.appliedDays ?? record.totalDays ?? record.days} Days`} />
                <Divider />
                <Row label="Active"   value={`${record.activeDays  ?? record.totalDays ?? record.days} Days`} />
              </Section>
 
              {/* Cancelled dates */}
              {record.cancelledDates?.length > 0 && (
                <Section title="Cancelled Dates">
                  {record.cancelledDates.map((d, i) => <Bullet key={i} text={d} />)}
                </Section>
              )}
 
              {/* Actual leave dates */}
              {record.actualLeaveDates?.length > 0 && (
                <Section title="Actual Leave Dates">
                  {record.actualLeaveDates.map((d, i) => <Bullet key={i} text={d} />)}
                </Section>
              )}
 
              {/* Rejection reason */}
              {record.rejectionReason && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Rejection Reason</p>
                  <div className="rounded-xl px-4 py-3 text-gray-600 text-sm"
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    {record.rejectionReason}
                  </div>
                </div>
              )}
 
              {/* Reason */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Reason</p>
                <div className="rounded-xl px-4 py-3 text-gray-600 text-sm"
                  style={{ background: BG_LIGHT_D, border: `1px solid ${BORDER_D}` }}>
                  {record.reason ?? '—'}
                </div>
              </div>
            </>
          )}
 
          {activeTab === 'documents' && (
            <>
              {/* Upload button */}
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: uploading ? '#9CA3AF' : PRIMARY_D }}>
                  {uploading
                    ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <Upload size={14} />}
                  Upload Document
                </div>
                <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
 
              {docLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" style={{ color: PRIMARY_D }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  No documents uploaded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={14} color={PRIMARY_D} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-gray-800 truncate">{doc.fileName}</p>
                          <p className="text-[10px] text-gray-400">{doc.uploadedAt?.split('T')[0] ?? ''}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteDoc(doc.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0 ml-2">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}