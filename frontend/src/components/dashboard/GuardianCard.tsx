import React from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, ShieldAlert, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';

export interface GuardianCardProps {
  className?: string;
}

export const GuardianCard: React.FC<GuardianCardProps> = ({ className = '' }) => {
  const { userProfile, isMinor } = useAuth();

  // If user is NOT a minor, do not show this card on the main dashboard!
  if (!isMinor) {
    return null;
  }

  const guardian = userProfile?.guardian;
  const isVerified = guardian?.verification_status === 'VERIFIED';

  return (
    <Card
      variant="panel"
      className={`border-purple-800/40 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/20 ${className}`}
      icon={<HeartHandshake className="w-5 h-5 text-purple-400" />}
      title="Guardian Connect"
      subtitle="Minor account guardian protection"
      action={
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
          isVerified
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          <span>{isVerified ? 'Connected' : 'Pending Verification'}</span>
        </span>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-800/30 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-purple-200">
              Active Minor Safeguard
            </span>
            <p className="text-purple-300/80 mt-0.5 leading-relaxed">
              Guardian Connect helps keep your trusted guardian informed when SafeSphere safety features are used.
            </p>
          </div>
        </div>

        {guardian ? (
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Primary Guardian</span>
              <span className="text-slate-100 font-bold">{guardian.guardian_name}</span>
              <span className="text-slate-400 text-[11px] block">{guardian.relationship} &bull; {guardian.guardian_phone}</span>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/guardian">
                <Button variant="secondary" size="sm">
                  Update Guardian
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
            <span>⚠️ Guardian setup required before starting journeys.</span>
            <Link to="/guardian">
              <Button variant="primary" size="sm">
                Setup Guardian
              </Button>
            </Link>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Link
            to="/guardian"
            className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 font-semibold"
          >
            <span>View Guardian Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default GuardianCard;
