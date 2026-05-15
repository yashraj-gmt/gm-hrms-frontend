// src/hooks/useEmployeeLeave.js
import { useState, useEffect, useCallback, useRef } from 'react'
import leaveService from '@/services/leaveService'
import { useToast } from '@/components/shared/toast/ToastProvider'

/**
 * Central hook for all employee leave portal data & actions.
 * Pass employee.personalId (the ID from PersonalInformation entity).
 */
export function useEmployeeLeave(personalId) {
  const { toast } = useToast()

  // ── State ──────────────────────────────────────────────────────────────────
  const [leaves,       setLeaves]       = useState([])
  const [balances,     setBalances]     = useState([])
  const [leaveTypes,   setLeaveTypes]   = useState([])
  const [compOffs,     setCompOffs]     = useState([])

  const [leavesLoading,     setLeavesLoading]     = useState(false)
  const [balancesLoading,   setBalancesLoading]   = useState(false)
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false)
  const [compOffsLoading,   setCompOffsLoading]   = useState(false)

  const [leavePage,     setLeavePage]     = useState(0)
  const [leaveTotalPages, setLeaveTotalPages] = useState(0)
  const [leaveTotalElements, setLeaveTotalElements] = useState(0)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── Safe state setters (prevent updates after unmount) ─────────────────────
  const safe = (fn) => (...args) => {
    if (mountedRef.current) fn(...args)
  }

  // ── Fetch My Leaves ────────────────────────────────────────────────────────
  const fetchLeaves = useCallback(async (page = 0, size = 10) => {
    if (!personalId) return
    safe(setLeavesLoading)(true)
    try {
      const res = await leaveService.getMyLeaves(personalId, page, size)
      if (res.success) {
        safe(setLeaves)(res.data.content ?? [])
        safe(setLeavePage)(res.data.page ?? 0)
        safe(setLeaveTotalPages)(res.data.totalPages ?? 0)
        safe(setLeaveTotalElements)(res.data.totalElements ?? 0)
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to load leaves', 'Error')
    } finally {
      safe(setLeavesLoading)(false)
    }
  }, [personalId])

  // ── Fetch Leave Balance ────────────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!personalId) return
    safe(setBalancesLoading)(true)
    try {
      const year = new Date().getFullYear()
      const res  = await leaveService.searchBalance(
        { personalId, year }, 0, 50
      )
      if (res.success) {
        safe(setBalances)(res.data.content ?? [])
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to load balance', 'Error')
    } finally {
      safe(setBalancesLoading)(false)
    }
  }, [personalId])

  // ── Fetch Leave Types ──────────────────────────────────────────────────────
  const fetchLeaveTypes = useCallback(async () => {
    safe(setLeaveTypesLoading)(true)
    try {
      const res = await leaveService.getAllLeaveTypes('', 0, 50)
      if (res.success) {
        safe(setLeaveTypes)(res.data.content ?? [])
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to load leave types', 'Error')
    } finally {
      safe(setLeaveTypesLoading)(false)
    }
  }, [])

  // ── Fetch Comp Off Requests ────────────────────────────────────────────────
  const fetchCompOffs = useCallback(async () => {
    if (!personalId) return
    safe(setCompOffsLoading)(true)
    try {
      const res = await leaveService.getCompOffByUser(personalId)
      if (res.success) {
        safe(setCompOffs)(res.data ?? [])
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to load comp off', 'Error')
    } finally {
      safe(setCompOffsLoading)(false)
    }
  }, [personalId])

  // ── Apply Leave ────────────────────────────────────────────────────────────
  const applyLeave = useCallback(async (formData) => {
    try {
      const payload = {
        personalId:       personalId,
        leaveTypeId:      formData.leaveTypeId,
        startDate:        formData.startDate,
        endDate:          formData.endDate,
        startDayType:     formData.startDayType,
        endDayType:       formData.endDayType,
        reason:           formData.reason,
        notifyPersonalIds: formData.notifyIds ?? [],
      }
      const res = await leaveService.applyLeave(payload)
      if (res.success) {
        toast.success(
          `Leave request submitted. A confirmation has been sent to your email.`,
          'Leave Applied!'
        )
        // Refresh both leaves and balances
        await Promise.all([fetchLeaves(0), fetchBalances()])
        return { success: true }
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to apply leave', 'Application Failed')
      return { success: false, message: err?.message }
    }
  }, [personalId, fetchLeaves, fetchBalances])

  // ── Cancel Leave ───────────────────────────────────────────────────────────
  const cancelLeave = useCallback(async (leaveId, cancelReason) => {
    try {
      const res = await leaveService.cancelLeave(leaveId, cancelReason)
      if (res.success) {
        toast.success('Leave cancelled. Balance has been restored.', 'Cancelled')
        await Promise.all([fetchLeaves(leavePage), fetchBalances()])
        return { success: true }
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to cancel leave', 'Cancel Failed')
      return { success: false }
    }
  }, [fetchLeaves, fetchBalances, leavePage])

  // ── Apply Comp Off ─────────────────────────────────────────────────────────
  const applyCompOff = useCallback(async (formData) => {
    try {
      const payload = {
        personalId: personalId,
        workedDate:  formData.workedDate,
        earnedDays:  parseFloat(formData.earnedDays),
        totalHours:  Number(formData.totalHours),
        reason:      formData.reason,
      }
      const res = await leaveService.applyCompOff(payload)
      if (res.success) {
        toast.success('Comp off request submitted successfully.', 'Submitted')
        await fetchCompOffs()
        return { success: true }
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to submit comp off', 'Error')
      return { success: false }
    }
  }, [personalId, fetchCompOffs])

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLeaves()
    fetchBalances()
    fetchLeaveTypes()
    fetchCompOffs()
  }, [fetchLeaves, fetchBalances, fetchLeaveTypes, fetchCompOffs])

  return {
    // Data
    leaves, balances, leaveTypes, compOffs,

    // Loading
    leavesLoading, balancesLoading, leaveTypesLoading, compOffsLoading,

    // Pagination
    leavePage, leaveTotalPages, leaveTotalElements,

    // Actions
    fetchLeaves, fetchBalances, fetchCompOffs,
    applyLeave, cancelLeave, applyCompOff,
    setLeavePage: (p) => fetchLeaves(p),
  }
}