// src/hooks/useLeave.js
import { useState, useEffect, useCallback, useRef } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'

// ── Generic async hook ─────────────────────────────────────────────────────────
function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError]     = useState(null)
  const mountedRef            = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      if (mountedRef.current) setData(result?.data ?? result)
      return result
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'Something went wrong')
      throw err
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, execute, setData }
}

// ── Paginated list hook ───────────────────────────────────────────────────────
export function usePaginatedList(fetchFn, { autoFetch = true } = {}) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [page, setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetch = useCallback(async (p = 0, size = 10, ...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn(p, size, ...args)
      const d   = res?.data
      if (mountedRef.current) {
        setItems(d?.content ?? [])
        setPage(d?.page ?? p)
        setTotalPages(d?.totalPages ?? 1)
        setTotalElements(d?.totalElements ?? 0)
      }
      return d
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'Failed to load')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => { if (autoFetch) fetch(0) }, []) // eslint-disable-line

  return { items, loading, error, page, totalPages, totalElements, fetch, setItems }
}

// ── Leave Requests ────────────────────────────────────────────────────────────
export function useLeaveRequests() {
  const { toast } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async (p = 0, size = 10) => {
    setLoading(true)
    try {
      const res = await leaveService.getAllRequests(p, size)

      if (mountedRef.current) {
        setRecords(res?.data?.content ?? [])
        setPage(res?.data?.page ?? p)
        setTotalPages(res?.data?.totalPages ?? 1)
        setTotalElements(res?.data?.totalElements ?? 0)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch leave requests')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll(0) }, [fetchAll])

  const approve = useCallback(async (id, approverId) => {
    try {
      await leaveService.approveLeave(id, approverId)
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: 'APPROVED' } : r))
      toast.success('Leave approved successfully')
    } catch (err) {
      toast.error(err?.message || 'Failed to approve leave')
      throw err
    }
  }, [toast])

  const reject = useCallback(async (id, reason) => {
    try {
      await leaveService.rejectLeave(id, reason)
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: 'REJECTED' } : r))
      toast.success('Leave rejected')
    } catch (err) {
      toast.error(err?.message || 'Failed to reject leave')
      throw err
    }
  }, [toast])

  const cancel = useCallback(async (id) => {
    try {
      await leaveService.cancelLeave(id)
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: 'CANCELLED' } : r))
      toast.success('Leave cancelled')
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel leave')
      throw err
    }
  }, [toast])

  return { records, loading, page, totalPages, totalElements, fetchAll, approve, reject, cancel, setRecords }
}

// ── Leave Balance ─────────────────────────────────────────────────────────────
export function useLeaveBalance() {
  const { toast } = useToast()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  // ── Leave Balance hook ────────────────────────────────────────────
const search = useCallback(async (filter = {}, p = 0, size = 10) => {
  setLoading(true)
  try {
    const res = await leaveService.searchBalance(filter, p, size) 
    if (mountedRef.current) {
      setItems(res?.data?.content ?? [])
      setPage(res?.data?.page ?? p)
      setTotalPages(res?.data?.totalPages ?? 1)
      setTotalElements(res?.data?.totalElements ?? 0)
    }
  } catch (err) {
    toast.error(err?.message || 'Failed to fetch leave balance')
  } finally {
    if (mountedRef.current) setLoading(false)
  }
}, [toast])

  useEffect(() => { search({}, 0) }, [search])

  return { items, loading, page, totalPages, totalElements, search }
}

// ── Leave Types ───────────────────────────────────────────────────────────────
export function useLeaveTypes() {
  const { toast } = useToast()
  const [types, setTypes]     = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async (search = '') => {
    setLoading(true)
    try {
      const res = await leaveService.getAllLeaveTypes(search)
      if (mountedRef.current) setTypes(res?.data?.content ?? [])
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch leave types')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (dto) => {
    const res = await leaveService.createLeaveType(dto)
    const created = res?.data
    setTypes((prev) => [...prev, created])
    toast.success('Leave type created')
    return created
  }, [toast])

  const update = useCallback(async (id, dto) => {
    const res = await leaveService.updateLeaveType(id, dto)
    const updated = res?.data
    setTypes((prev) => prev.map((t) => t.id === id ? updated : t))
    toast.success('Leave type updated')
    return updated
  }, [toast])

  const remove = useCallback(async (id) => {
    await leaveService.deleteLeaveType(id)
    setTypes((prev) => prev.filter((t) => t.id !== id))
    toast.success('Leave type deleted')
  }, [toast])

  return { types, loading, fetchAll, create, update, remove }
}

// ── Leave Policies ────────────────────────────────────────────────────────────
export function useLeavePolicies() {
  const { toast } = useToast()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading]   = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await leaveService.getAllPolicies()
      if (mountedRef.current) setPolicies(res?.data?.content ?? [])
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch policies')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (dto) => {
    const res = await leaveService.createPolicy(dto)
    const created = res?.data
    setPolicies((prev) => [...prev, created])
    toast.success('Policy created successfully')
    return created
  }, [toast])

  const update = useCallback(async (id, dto) => {
    const res = await leaveService.updatePolicy(id, dto)
    const updated = res?.data
    setPolicies((prev) => prev.map((p) => p.id === id ? updated : p))
    toast.success('Policy updated successfully')
    return updated
  }, [toast])

  const remove = useCallback(async (id) => {
    await leaveService.deletePolicy(id)
    setPolicies((prev) => prev.filter((p) => p.id !== id))
    toast.success('Policy deleted')
  }, [toast])

  return { policies, loading, fetchAll, create, update, remove }
}

// ── Policy Mappings ───────────────────────────────────────────────────────────
export function usePolicyMappings() {
  const { toast } = useToast()
  const [mappings, setMappings] = useState([])
  const [loading, setLoading]   = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await leaveService.getAllPolicyMappings()
      if (mountedRef.current) setMappings(res?.data?.content ?? [])
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch policy mappings')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (dto) => {
    const res = await leaveService.createPolicyMapping(dto)
    const created = res?.data
    setMappings((prev) => [...prev, created])
    toast.success('Policy type mapping created')
    return created
  }, [toast])

  const update = useCallback(async (id, dto) => {
    const res = await leaveService.updatePolicyMapping(id, dto)
    const updated = res?.data
    setMappings((prev) => prev.map((m) => m.id === id ? updated : m))
    toast.success('Mapping updated')
    return updated
  }, [toast])

  const remove = useCallback(async (id) => {
    await leaveService.deletePolicyMapping(id)
    setMappings((prev) => prev.filter((m) => m.id !== id))
    toast.success('Mapping deleted')
  }, [toast])

  return { mappings, loading, fetchAll, create, update, remove }
}

// ── Application Rules ─────────────────────────────────────────────────────────
export function useApplicationRules() {
  const { toast } = useToast()
  const [rules, setRules]     = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await leaveService.getAllApplicationRules()
      if (mountedRef.current) setRules(res?.data?.content ?? [])
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch application rules')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (dto) => {
    const res = await leaveService.createApplicationRule(dto)
    const created = res?.data
    setRules((prev) => [...prev, created])
    toast.success('Application rule created')
    return created
  }, [toast])

  const update = useCallback(async (id, dto) => {
    const res = await leaveService.updateApplicationRule(id, dto)
    const updated = res?.data
    setRules((prev) => prev.map((r) => r.id === id ? updated : r))
    toast.success('Rule updated')
    return updated
  }, [toast])

  const remove = useCallback(async (id) => {
    await leaveService.deleteApplicationRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
    toast.success('Rule deleted')
  }, [toast])

  return { rules, loading, fetchAll, create, update, remove }
}

// ── Eligibility Rules ─────────────────────────────────────────────────────────
export function useEligibilityRules() {
  const { toast } = useToast()
  const [rules, setRules]     = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await leaveService.getAllEligibilityRules()
      if (mountedRef.current) setRules(res?.data?.content ?? [])
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch eligibility rules')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (dto) => {
    const res = await leaveService.createEligibilityRule(dto)
    const created = res?.data
    setRules((prev) => [...prev, created])
    toast.success('Eligibility rule created')
    return created
  }, [toast])

  const update = useCallback(async (id, dto) => {
    const res = await leaveService.updateEligibilityRule(id, dto)
    const updated = res?.data
    setRules((prev) => prev.map((r) => r.id === id ? updated : r))
    toast.success('Rule updated')
    return updated
  }, [toast])

  const remove = useCallback(async (id) => {
    await leaveService.deleteEligibilityRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
    toast.success('Rule deleted')
  }, [toast])

  return { rules, loading, fetchAll, create, update, remove }
}

// ── Comp Off ──────────────────────────────────────────────────────────────────
export function useCompOff() {
  const { toast } = useToast()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async (p = 0, size = 10) => {
    setLoading(true)
    try {
      const res = await leaveService.getAllCompOff(p, size)
      if (mountedRef.current) {
        setItems(res?.data?.content ?? [])
        setPage(res?.data?.page ?? p)
        setTotalPages(res?.data?.totalPages ?? 1)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch comp-off requests')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll(0) }, [fetchAll])

  const apply = useCallback(async (dto) => {
    const res = await leaveService.applyCompOff(dto)
    const created = res?.data
    setItems((prev) => [created, ...prev])
    toast.success('Comp-off request submitted')
    return created
  }, [toast])

  const approve = useCallback(async (id, approverId) => {
    await leaveService.approveCompOff(id, approverId)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: 'APPROVED' } : i))
    toast.success('Comp-off approved')
  }, [toast])

  const reject = useCallback(async (id, approverId) => {
    await leaveService.rejectCompOff(id, approverId)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: 'REJECTED' } : i))
    toast.success('Comp-off rejected')
  }, [toast])

  return { items, loading, page, totalPages, fetchAll, apply, approve, reject }
}

// ── Encashment Rules ──────────────────────────────────────────────────────────
export function useEncashmentRules() {
  const { toast } = useToast()
  const [rules, setRules]     = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await leaveService.getAllEncashmentRules()
      if (mountedRef.current) setRules(res?.data?.content ?? [])
    } catch (err) {
      toast.error(err?.message || 'Failed to fetch encashment rules')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (dto) => {
    const res = await leaveService.createEncashmentRule(dto)
    const created = res?.data
    setRules((prev) => [...prev, created])
    toast.success('Encashment rule created')
    return created
  }, [toast])

  const update = useCallback(async (id, dto) => {
    const res = await leaveService.updateEncashmentRule(id, dto)
    const updated = res?.data
    setRules((prev) => prev.map((r) => r.id === id ? updated : r))
    toast.success('Rule updated')
    return updated
  }, [toast])

  const remove = useCallback(async (id) => {
    await leaveService.deleteEncashmentRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
    toast.success('Rule deleted')
  }, [toast])

  return { rules, loading, fetchAll, create, update, remove }
}