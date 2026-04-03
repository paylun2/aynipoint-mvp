'use client'

import { useState, useTransition } from 'react'
import { toggleKybVerification } from '@/app/actions/admin'
import { Loader2 } from 'lucide-react'

export default function AdminToggleClient({ initialValue }: { initialValue: boolean }) {
    const [isPending, startTransition] = useTransition()
    const [enabled, setEnabled] = useState(initialValue)
    const [errorMsg, setErrorMsg] = useState('')

    const handleToggle = () => {
        if (isPending) return
        setErrorMsg('')
        const newValue = !enabled

        // Optimistic UI update
        setEnabled(newValue)

        startTransition(async () => {
            const result = await toggleKybVerification(newValue)
            if (!result.success) {
                setEnabled(!newValue) // Revert on failure
                setErrorMsg(result.error || 'Fallo de seguridad al actualizar status')
            }
        })
    }

    return (
        <div className="flex flex-col items-end">
            <button
                onClick={handleToggle}
                disabled={isPending}
                className={`relative inline-flex h-10 w-20 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] ${
                    enabled ? 'bg-orange-500 focus:ring-orange-500/50' : 'bg-emerald-500 focus:ring-emerald-500/50'
                } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={enabled}
            >
                <div
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                        enabled ? 'translate-x-10' : 'translate-x-0'
                    }`}
                >
                    {isPending ? (
                        <Loader2 className="w-4 h-4 text-black animate-spin" />
                    ) : (
                        <div className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                    )}
                </div>
            </button>
            
            {errorMsg && (
                <p className="text-xs text-red-500 font-bold mt-2 animate-pulse">{errorMsg}</p>
            )}
        </div>
    )
}
