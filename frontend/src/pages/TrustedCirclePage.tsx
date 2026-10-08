import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { TrustedContact } from '../types';

export const TrustedCirclePage: React.FC = () => {
  const navigate = useNavigate();
  const [contacts] = useState<TrustedContact[]>([
    {
      id: 'tc-1',
      user_id: 'usr-demo',
      name: 'Sarah Miller',
      phone_number: '+1 (555) 234-5678',
      relationship: 'Sister',
      is_emergency_recipient: true,
    },
    {
      id: 'tc-2',
      user_id: 'usr-demo',
      name: 'Alex Rivera',
      phone_number: '+1 (555) 987-6543',
      relationship: 'Roommate / Colleague',
      is_emergency_recipient: true,
    },
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home Dashboard</span>
        </button>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Trusted Circle
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            People who immediately receive your live location and automated SOS notifications.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="px-4 py-2 rounded-xl bg-emerald-600/80 text-white text-xs font-semibold flex items-center gap-1.5 opacity-80 cursor-not-allowed"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Contact (Step 2)</span>
        </button>
      </div>

      <div className="space-y-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="p-4 rounded-xl glass-card border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {contact.name[0]}
              </div>
              <div>
                <h4 className="font-semibold text-slate-100 text-sm">{contact.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {contact.phone_number}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-300">{contact.relationship}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                SOS Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustedCirclePage;
