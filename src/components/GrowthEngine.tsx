import React, { useState } from 'react';
import { Gift, Copy, Trophy, Users, ArrowUpRight, TrendingUp } from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

export const GrowthEngine = () => {
  const [rewards, setRewards] = useState([
    { id: 1, referrals: 3, reward: 'Premium eBook: Email Marketing 101', active: true },
    { id: 2, referrals: 10, reward: 'Exclusive Community Access', active: true },
    { id: 3, referrals: 25, reward: 'Limited Edition T-Shirt', active: false },
  ]);

  const topReferrers = [
    { id: '1', email: 'alex@example.com', referrals: 42, joined: '2023-11-10' },
    { id: '2', email: 'sarah@design.co', referrals: 28, joined: '2023-12-05' },
    { id: '3', email: 'mike@startup.io', referrals: 15, joined: '2024-01-20' },
    { id: '4', email: 'emma@marketing.net', referrals: 12, joined: '2024-02-14' },
    { id: '5', email: 'david@agency.com', referrals: 9, joined: '2024-03-01' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-ink pb-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">Audience Expansion</p>
          <h2 className="text-4xl font-serif font-bold flex items-center gap-3">
            Growth Engine
            <HelpTooltip guideKey="growth-overview" />
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-burgundy/5 border border-burgundy/20">
            <TrendingUp size={14} className="text-burgundy" />
            <span className="text-[10px] font-black uppercase tracking-widest text-burgundy">Referral Program Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface border border-border-hairline p-8 space-y-2">
          <p className="metric-label">Total Referrals</p>
          <p className="text-4xl font-serif font-bold">1,284</p>
          <p className="text-xs text-status-success flex items-center gap-1 mt-2">
            <ArrowUpRight size={12} /> +12% this month
          </p>
        </div>
        <div className="bg-surface border border-border-hairline p-8 space-y-2">
          <p className="metric-label">Active Referrers</p>
          <p className="text-4xl font-serif font-bold">342</p>
          <p className="text-xs text-ink/60 mt-2">28% of total audience</p>
        </div>
        <div className="bg-surface border border-border-hairline p-8 space-y-2">
          <p className="metric-label">Rewards Claimed</p>
          <p className="text-4xl font-serif font-bold">89</p>
          <p className="text-xs text-ink/60 mt-2">Across all tiers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reward Tiers */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-border-hairline pb-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs flex items-center gap-2">
              Reward Milestones
              <HelpTooltip guideKey="growth-rewards" />
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline">
              + Add Tier
            </button>
          </div>
          <div className="space-y-4">
            {rewards.map((reward) => (
              <div key={reward.id} className={`p-6 border ${reward.active ? 'border-ink bg-white' : 'border-border-hairline bg-surface opacity-60'} flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-burgundy/10 flex items-center justify-center text-burgundy font-serif text-xl font-bold">
                    {reward.referrals}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg">{reward.reward}</h4>
                    <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest mt-1">
                      {reward.active ? 'Active Milestone' : 'Draft Milestone'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-ink/40 hover:text-burgundy transition-colors">Edit</button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-surface border border-border-hairline p-6 mt-8">
            <h4 className="font-sans font-black uppercase tracking-widest text-[10px] mb-2">How to use</h4>
            <p className="text-sm text-ink/60 mb-4">Add the referral widget to any broadcast to let subscribers share and earn rewards.</p>
            <code className="block bg-white border border-border-hairline p-3 text-xs font-mono text-ink/80">
              [[REFERRAL_WIDGET]]
            </code>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-border-hairline pb-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs flex items-center gap-2">
              Top Referrers
              <HelpTooltip guideKey="growth-leaderboard" />
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-ink">
              View All
            </button>
          </div>
          <div className="bg-white border border-border-hairline">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/40">
                <tr>
                  <th className="p-4 font-normal">Rank</th>
                  <th className="p-4 font-normal">Subscriber</th>
                  <th className="p-4 font-normal text-right">Referrals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {topReferrers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-surface/50 transition-colors">
                    <td className="p-4">
                      {idx < 3 ? (
                        <Trophy size={16} className={idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-amber-700'} />
                      ) : (
                        <span className="text-ink/40 font-mono">{idx + 1}</span>
                      )}
                    </td>
                    <td className="p-4 font-medium">{user.email}</td>
                    <td className="p-4 text-right font-serif font-bold text-lg">{user.referrals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
