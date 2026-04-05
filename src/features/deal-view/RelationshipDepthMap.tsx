/**
 * RelationshipDepthMap — R3
 * SVG node graph of deal contacts. TierGated.
 */

import { useState } from 'react'
import { Users, AlertTriangle, Plus, X } from 'lucide-react'
import {
  useDealContacts,
  useAddContact,
  contactNodeColour,
  contactNodeRadius,
  type ContactRole,
  type ContactSeniority,
} from '../../hooks/useDealContacts'
import TierGate from '../../components/shared/TierGate'

const ROLE_OPTIONS: ContactRole[] = ['Champion', 'Influencer', 'Economic_Buyer', 'Blocker', 'Unknown']
const SENIORITY_OPTIONS: ContactSeniority[] = ['C-Suite', 'VP', 'Director', 'Manager', 'IC', 'Unknown']

interface Props { dealId: string }

export default function RelationshipDepthMap({ dealId }: Props) {
  const { data: contacts = [], isLoading } = useDealContacts(dealId)
  const addContact = useAddContact(dealId)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<ContactRole>('Unknown')
  const [seniority, setSeniority] = useState<ContactSeniority>('Unknown')

  const singleThreaded = contacts.length === 1
  const svgW = 480
  const svgH = 200
  const centerX = svgW / 2
  const centerY = svgH / 2

  // Position nodes in a circle
  function nodePosition(i: number, total: number) {
    if (total === 1) return { x: centerX, y: centerY }
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2
    const r = Math.min(svgW, svgH) * 0.32
    return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await addContact.mutateAsync({ contact_name: name, contact_role: role, contact_seniority: seniority })
    setName('')
    setRole('Unknown')
    setSeniority('Unknown')
    setShowForm(false)
  }

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6366F1]" />
            <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af]">
              Relationship Map
            </h2>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[#6366F1] border border-[#6366F1]/40 px-3 py-1.5 hover:border-[#6366F1] transition-colors"
          >
            {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showForm ? 'Cancel' : 'Add contact'}
          </button>
        </div>

        {/* Single-threaded warning */}
        {singleThreaded && (
          <div className="flex items-start gap-2 bg-[#FF6B6B]/10 border border-[#FF6B6B]/40 p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#FF6B6B] font-medium">
              Single-threaded engagement — only one contact recorded. Multi-thread to reduce deal risk.
            </p>
          </div>
        )}

        {/* Add contact form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-[#1c1c1f] border border-[#2a2a2e] p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contact name"
                className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 focus:border-[#6366F1] outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ContactRole)}
                className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 focus:border-[#6366F1] outline-none"
              >
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">Seniority</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as ContactSeniority)}
                className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 focus:border-[#6366F1] outline-none"
              >
                {SENIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={addContact.isPending}
                className="bg-[#6366F1] text-white text-sm px-4 py-2 hover:bg-[#5457e5] transition-colors disabled:opacity-50"
              >
                {addContact.isPending ? 'Adding…' : 'Add Contact'}
              </button>
            </div>
          </form>
        )}

        {/* SVG node graph */}
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-[#6b7280] text-sm">
            No contacts yet. Add a contact to start mapping the relationship.
          </div>
        ) : (
          <svg
            width="100%"
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="overflow-visible"
            data-testid="relationship-svg"
          >
            {/* Connect all nodes to center */}
            {contacts.length > 1 && contacts.map((_, i) => {
              const pos = nodePosition(i, contacts.length)
              return (
                <line
                  key={`line-${i}`}
                  x1={centerX} y1={centerY}
                  x2={pos.x} y2={pos.y}
                  stroke="#2a2a2e"
                  strokeWidth={1}
                />
              )
            })}

            {contacts.map((contact, i) => {
              const pos = nodePosition(i, contacts.length)
              const r = contactNodeRadius(contact.engagement_count)
              const colour = contactNodeColour(contact.last_contacted_at)
              return (
                <g key={contact.id} data-testid={`contact-node-${contact.id}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    fill={colour}
                    fillOpacity={0.15}
                    stroke={colour}
                    strokeWidth={2}
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fontFamily="DM Sans, sans-serif"
                    fill={colour}
                    fontWeight="600"
                  >
                    {contact.contact_name.split(' ')[0]}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y + r + 10}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="DM Sans, sans-serif"
                    fill="#6b7280"
                  >
                    {contact.contact_role.replace('_', ' ')}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </section>
    </TierGate>
  )
}
