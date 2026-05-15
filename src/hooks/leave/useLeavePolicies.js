// src/hooks/leave/useLeavePolicies.js
import { useState, useCallback, useEffect } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { ROLES } from '@/constants/roles'
 
export function useLeavePolicies() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.role === ROLES.ADMIN
 
  const [policies,  setPolicies]  = useState([])
  const [mappings,  setMappings]  = useState([])
  const [appRules,  setAppRules]  = useState([])
  const [eligRules, setEligRules] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
 
  const fetchPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, mRes, aRes, eRes] = await Promise.all([
        leaveService.getAllPolicies(),
        leaveService.getAllPolicyMappings(),
        leaveService.getAllApplicationRules(),
        leaveService.getAllEligibilityRules(),
      ])
      if (pRes.success) setPolicies(pRes.data.content ?? [])
      if (mRes.success) setMappings(mRes.data.content ?? [])
      if (aRes.success) setAppRules(aRes.data.content ?? [])
      if (eRes.success) setEligRules(eRes.data.content ?? [])
    } catch (e) {
      toast.error(e?.message ?? 'Failed to load policies')
    } finally {
      setLoading(false)
    }
  }, [toast])
 
  useEffect(() => { fetchPolicies() }, [fetchPolicies])
 
  // ── Policy CRUD ────────────────────────────────────────────────────────────
  const createPolicy = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.createPolicy(dto)
      if (res.success) {
        toast.success('Policy created')
        await fetchPolicies()
        return true
      }
    } catch (e) { toast.error(e?.message ?? 'Create failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchPolicies])
 
  const updatePolicy = useCallback(async (id, dto) => {
    setSaving(true)
    try {
      const res = await leaveService.updatePolicy(id, dto)
      if (res.success) { toast.success('Policy updated'); await fetchPolicies(); return true }
    } catch (e) { toast.error(e?.message ?? 'Update failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchPolicies])
 
  const deletePolicy = useCallback(async (id) => {
    if (!isAdmin) { toast.error('Only Admin can delete policies'); return false }
    setDeleting(id)
    try {
      const res = await leaveService.deletePolicy(id)
      if (res.success) { toast.success('Policy deleted'); setPolicies((prev) => prev.filter((p) => p.id !== id)); return true }
    } catch (e) { toast.error(e?.message ?? 'Delete failed') } finally { setDeleting(null) }
    return false
  }, [isAdmin, toast])
 
  // ── Mapping CRUD ───────────────────────────────────────────────────────────
  const createMapping = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.createPolicyMapping(dto)
      if (res.success) { toast.success('Mapping created'); await fetchPolicies(); return true }
    } catch (e) { toast.error(e?.message ?? 'Create failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchPolicies])
 
  const deleteMapping = useCallback(async (id) => {
    if (!isAdmin) { toast.error('Only Admin can delete mappings'); return false }
    setDeleting(id)
    try {
      const res = await leaveService.deletePolicyMapping(id)
      if (res.success) { toast.success('Mapping deleted'); setMappings((prev) => prev.filter((m) => m.id !== id)); return true }
    } catch (e) { toast.error(e?.message ?? 'Delete failed') } finally { setDeleting(null) }
    return false
  }, [isAdmin, toast])
 
  // ── Application Rule CRUD ─────────────────────────────────────────────────
  const createAppRule = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.createApplicationRule(dto)
      if (res.success) { toast.success('Application rule created'); await fetchPolicies(); return true }
    } catch (e) { toast.error(e?.message ?? 'Create failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchPolicies])
 
  const updateAppRule = useCallback(async (id, dto) => {
    setSaving(true)
    try {
      const res = await leaveService.updateApplicationRule(id, dto)
      if (res.success) { toast.success('Rule updated'); await fetchPolicies(); return true }
    } catch (e) { toast.error(e?.message ?? 'Update failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchPolicies])
 
  const deleteAppRule = useCallback(async (id) => {
    if (!isAdmin) { toast.error('Only Admin can delete rules'); return false }
    setDeleting(id)
    try {
      const res = await leaveService.deleteApplicationRule(id)
      if (res.success) { toast.success('Rule deleted'); setAppRules((prev) => prev.filter((r) => r.id !== id)); return true }
    } catch (e) { toast.error(e?.message ?? 'Delete failed') } finally { setDeleting(null) }
    return false
  }, [isAdmin, toast])
 
  // ── Eligibility Rule CRUD ─────────────────────────────────────────────────
  const createEligRule = useCallback(async (dto) => {
    setSaving(true)
    try {
      const res = await leaveService.createEligibilityRule(dto)
      if (res.success) { toast.success('Eligibility rule created'); await fetchPolicies(); return true }
    } catch (e) { toast.error(e?.message ?? 'Create failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchPolicies])
 
  const updateEligRule = useCallback(async (id, dto) => {
    setSaving(true)
    try {
      const res = await leaveService.updateEligibilityRule(id, dto)
      if (res.success) { toast.success('Rule updated'); await fetchPolicies(); return true }
    } catch (e) { toast.error(e?.message ?? 'Update failed') } finally { setSaving(false) }
    return false
  }, [toast, fetchPolicies])
 
  const deleteEligRule = useCallback(async (id) => {
    if (!isAdmin) { toast.error('Only Admin can delete rules'); return false }
    setDeleting(id)
    try {
      const res = await leaveService.deleteEligibilityRule(id)
      if (res.success) { toast.success('Rule deleted'); setEligRules((prev) => prev.filter((r) => r.id !== id)); return true }
    } catch (e) { toast.error(e?.message ?? 'Delete failed') } finally { setDeleting(null) }
    return false
  }, [isAdmin, toast])
 
  return {
    policies, mappings, appRules, eligRules,
    loading, saving, deleting,
    fetchPolicies,
    createPolicy, updatePolicy, deletePolicy,
    createMapping, deleteMapping,
    createAppRule, updateAppRule, deleteAppRule,
    createEligRule, updateEligRule, deleteEligRule,
  }
}