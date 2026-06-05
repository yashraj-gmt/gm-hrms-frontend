// src/pages/profile/ProfilePage.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  User, Mail, Phone, Building2, Briefcase, MapPin,
  Lock, Eye, EyeOff, Camera, Check, X, AlertCircle, Loader2,
} from 'lucide-react'
import { useAuthStore }  from '@/store/authStore'
import profileService    from '@/services/profileService'
import authService       from '@/services/authService'
import profileIcon       from '@/assets/images/profile-icon.png'
import { useToast } from '@/components/shared/toast/ToastProvider'


const BRAND      = '#C35E33'
const BRAND_DARK = '#A34A24'

// ─── helpers ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function Field({ icon: Icon, label, value, editing, name, onChange, type = 'text', readOnly = false }) {
  const active = editing && !readOnly
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div
        className="flex items-center gap-3 px-4 h-11 rounded-xl border bg-white transition-colors"
        style={{ borderColor: active ? BRAND : '#E5E7EB' }}
      >
        <Icon size={16} color={active ? BRAND : '#9CA3AF'} strokeWidth={2} className="flex-shrink-0" />
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          readOnly={!active}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 font-medium placeholder:text-gray-400"
          style={{ cursor: active ? 'text' : 'default' }}
        />
        {readOnly && editing && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
            read-only
          </span>
        )}
      </div>
    </div>
  )
}

function PasswordField({ label, name, value, onChange, show, onToggleShow }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div
        className="flex items-center gap-3 px-4 h-11 rounded-xl border bg-white transition-colors"
        style={{ borderColor: BRAND }}
      >
        <Lock size={16} color={BRAND} strokeWidth={2} className="flex-shrink-0" />
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800"
          placeholder="••••••••"
        />
        <button type="button" onClick={onToggleShow} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function Toast({ message, type }) {
  if (!message) return null
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white"
      style={{ backgroundColor: type === 'success' ? '#16A34A' : '#DC2626' }}
    >
      {type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, setUser } = useAuthStore()

  // ── profile state ─────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({
    name:        '',
    email:       '',
    phone:       '',
    phoneCode:   '+91',
    designation: '',
    department:  '',
    branch:      '',
  })
  const [saved, setSaved] = useState({ ...form })

  // ── avatar ────────────────────────────────────────────────────
  const [avatar,         setAvatar]         = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileRef = useRef(null)

  // ── password ──────────────────────────────────────────────────
  const [pwSection, setPwSection] = useState(false)
  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' })
  const [showPw,    setShowPw]    = useState({ current: false, next: false, confirm: false })
  const [pwError,   setPwError]   = useState('')

  // ── toast ─────────────────────────────────────────────────────
  const { toast } = useToast()
const showToast = useCallback((message, type = 'success') => {
  type === 'success' ? toast.success(message) : toast.error(message)
}, [toast])

  // ── load profile on mount ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await profileService.getMe()
        const data = res?.data ?? res ?? {}
        const snap = {
          name:        data.fullName    || user?.name        || '',
          email:       data.email       || user?.email       || '',
          phone:       data.phone       || user?.phone       || '',
          phoneCode:   data.phoneCode   || user?.phoneCode   || '+91',
          designation: data.designation || user?.designation || '',
          department:  data.department  || user?.department  || '',
          branch:      data.branch      || user?.branch      || '',
        }
        setForm(snap)
        setSaved(snap)
        setAvatar(data.profileImageUrl || user?.avatar || null)
      } catch {
        // fall back to whatever is in the auth store
        const snap = {
          name:        user?.name        || '',
          email:       user?.email       || '',
          phone:       user?.phone       || '',
          phoneCode:   user?.phoneCode   || '+91',
          designation: user?.designation || '',
          department:  user?.department  || '',
          branch:      user?.branch      || '',
        }
        setForm(snap)
        setSaved(snap)
        setAvatar(user?.avatar || null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // ── save profile ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const res  = await profileService.updateProfile({
        name: form.name,
        phone: form.phone,
        phoneCode: form.phoneCode
      })
      const data = res?.data ?? res ?? {}

      const updated = {
        ...form,
        name:  data.fullName  || form.name,
        phone: data.phone     || form.phone,
        phoneCode: data.phoneCode || form.phoneCode,
      }
      setSaved(updated)
      setForm(updated)

      // sync header
      setUser?.({ ...user, ...updated, avatar })
      setEditing(false)
      showToast('Profile updated successfully!')
    } catch (err) {
      showToast(err?.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({ ...saved })
    setEditing(false)
  }

  // ── avatar upload ─────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // preview immediately
    const reader = new FileReader()
    reader.onload = () => setAvatar(reader.result)
    reader.readAsDataURL(file)

    setAvatarUploading(true)
    try {
      const res  = await profileService.uploadAvatar(file)
      const data = res?.data ?? res ?? {}
      const url  = data.profileImageUrl || reader.result

      setAvatar(url)
      setUser?.({ ...user, avatar: url })
      showToast('Profile photo updated!')
    } catch (err) {
      showToast(err?.message || 'Failed to upload photo', 'error')
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── change password ───────────────────────────────────────────
  const handlePasswordSave = async () => {
    setPwError('')
    if (!pwForm.current)          return setPwError('Current password is required.')
    if (pwForm.next.length < 8)   return setPwError('New password must be at least 8 characters.')
    if (pwForm.next !== pwForm.confirm) return setPwError('Passwords do not match.')

    setPwSaving(true)
    try {
      await authService.changePassword(pwForm.current, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      setPwSection(false)
      showToast('Password changed successfully!')
    } catch (err) {
      setPwError(err?.message || 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  const initials = (form.name || 'U').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin" style={{ color: BRAND }} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* ── Page title ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information and account security.</p>
      </div>

      {/* ── Avatar Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center  justify-center text-3xl font-bold text-white"
            style={{ backgroundColor: 'white' }}>
            {avatar
              ? <img src={avatar} alt="avatar" className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.src = profileIcon }} />
              : <span>{initials}</span>
            }
          </div>

          <button
            onClick={() => !avatarUploading && fileRef.current.click()}
            title="Change photo"
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md transition-colors disabled:opacity-70"
            style={{ backgroundColor: BRAND }}
            onMouseEnter={e => !avatarUploading && (e.currentTarget.style.backgroundColor = BRAND_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}
          >
            {avatarUploading
              ? <Loader2 size={13} className="animate-spin" />
              : <Camera size={14} strokeWidth={2.5} />
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{form.name}</h2>
          <p className="text-sm text-gray-500">{form.designation} · {form.department}</p>
          <p className="text-sm text-gray-400 mt-0.5">{form.email}</p>
        </div>

        <span
          className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: BRAND }}
        >
          {user?.role || 'Admin'}
        </span>
      </div>

      {/* ── Personal Information Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {editing ? 'Name and phone are editable. Other fields are managed by HR.' : 'Update your details below'}
            </p>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ backgroundColor: BRAND }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-70"
                style={{ backgroundColor: BRAND }}
                onMouseEnter={e => !saving && (e.currentTarget.style.backgroundColor = BRAND_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* editable */}
          <Field icon={User}  label="Full Name" name="name"  value={form.name}  editing={editing} onChange={handleFormChange} />
          
          {/* Phone Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
            <div
              className="flex items-center gap-3 px-4 h-11 rounded-xl border bg-white transition-colors"
              style={{ borderColor: editing ? BRAND : '#E5E7EB' }}
            >
              <Phone size={16} color={editing ? BRAND : '#9CA3AF'} strokeWidth={2} className="flex-shrink-0" />
              {editing ? (
                <>
                  <select
                    name="phoneCode"
                    value={form.phoneCode}
                    onChange={handleFormChange}
                    className="bg-transparent outline-none text-sm text-gray-800 font-medium cursor-pointer"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+971">+971</option>
                    <option value="+65">+65</option>
                    <option value="+61">+61</option>
                    <option value="+966">+966</option>
                    <option value="+968">+968</option>
                    <option value="+974">+974</option>
                    <option value="+973">+973</option>
                    <option value="+965">+965</option>
                  </select>
                  <span className="text-gray-300">|</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="phone"
                    value={form.phone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setForm((prev) => ({ ...prev, phone: v }))
                    }}
                    placeholder="9876543210"
                    maxLength={10}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 font-medium placeholder:text-gray-400"
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={`${form.phoneCode || '+91'} ${form.phone || ''}`}
                  readOnly
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 font-medium cursor-default"
                />
              )}
            </div>
          </div>
          {/* read-only — managed by HR */}
          <Field icon={Mail}      label="Email"       name="email"       value={form.email}       editing={editing} onChange={handleFormChange} readOnly />
          <Field icon={Briefcase} label="Designation" name="designation" value={form.designation} editing={editing} onChange={handleFormChange} readOnly />
          <Field icon={Building2} label="Department"  name="department"  value={form.department}  editing={editing} onChange={handleFormChange} readOnly />
          <Field icon={MapPin}    label="Branch"      name="branch"      value={form.branch}      editing={editing} onChange={handleFormChange} readOnly />
        </div>
      </div>

      {/* ── Change Password Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
            <p className="text-xs text-gray-400 mt-0.5">Keep your account secure with a strong password</p>
          </div>
          {!pwSection && (
            <button
              onClick={() => { setPwSection(true); setPwError('') }}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Update Password
            </button>
          )}
        </div>

        {pwSection && (
          <div className="mt-5 space-y-4">
            <PasswordField
              label="Current Password" name="current" value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              show={showPw.current}
              onToggleShow={() => setShowPw(p => ({ ...p, current: !p.current }))}
            />
            <PasswordField
              label="New Password" name="next" value={pwForm.next}
              onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
              show={showPw.next}
              onToggleShow={() => setShowPw(p => ({ ...p, next: !p.next }))}
            />
            <PasswordField
              label="Confirm New Password" name="confirm" value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              show={showPw.confirm}
              onToggleShow={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
            />

            {pwForm.next.length > 0 && (
              <p className={`text-xs ${pwForm.next.length >= 8 ? 'text-green-600' : 'text-amber-500'}`}>
                {pwForm.next.length >= 8 ? '✓ Strong enough' : `${8 - pwForm.next.length} more characters needed`}
              </p>
            )}

            {pwError && (
              <p className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle size={14} /> {pwError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setPwSection(false); setPwError(''); setPwForm({ current: '', next: '', confirm: '' }) }}
                disabled={pwSaving}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSave}
                disabled={pwSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-70"
                style={{ backgroundColor: BRAND }}
                onMouseEnter={e => !pwSaving && (e.currentTarget.style.backgroundColor = BRAND_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}
              >
                {pwSaving && <Loader2 size={14} className="animate-spin" />}
                {pwSaving ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}