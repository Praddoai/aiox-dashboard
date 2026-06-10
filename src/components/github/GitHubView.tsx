import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  GitCommit,
  GitPullRequest,
  CircleDot,
  GitBranch,
  User,
} from 'lucide-react';
import { GlassCard, GlassButton, Badge, EmptyState, SectionLabel } from '../ui';
import { ICON_SIZES } from '../../lib/icons';
import { formatRelativeTime, cn } from '../../lib/utils';

const MONITOR_URL = import.meta.env.VITE_MONITOR_URL || 'http://localhost:4001';
const REPO = 'SynkraAI/aios-dashboard';

type TabType = 'commits' | 'pulls' | 'issues';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  refs: string[];
}

interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  createdAt: string;
  headRefName: string;
  url: string;
}

interface Issue {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  createdAt: string;
  labels: Array<{ name: string; color: string }>;
  url: string;
}

// ─── Demo Data ───────────────────────────────────────────────
const demoCommits: Commit[] = [
  { sha: 'a1b2c3d', message: 'feat: add kanban board filters and search', author: 'dex-dev', date: new Date(Date.now() - 2*3600000).toISOString(), url: '#', refs: ['HEAD -> master', 'origin/master'] },
  { sha: 'e4f5g6h', message: 'fix: resolve Map constructor conflict in RoadmapView', author: 'dex-dev', date: new Date(Date.now() - 5*3600000).toISOString(), url: '#', refs: [] },
  { sha: 'i7j8k9l', message: 'feat: implement activity timeline with demo data', author: 'dex-dev', date: new Date(Date.now() - 8*3600000).toISOString(), url: '#', refs: [] },
  { sha: 'm0n1o2p', message: 'refactor: notification preferences store with persist', author: 'dex-dev', date: new Date(Date.now() - 24*3600000).toISOString(), url: '#', refs: ['tag: v0.4.2'] },
  { sha: 'q3r4s5t', message: 'feat: add accent color picker to settings', author: 'aria-design', date: new Date(Date.now() - 26*3600000).toISOString(), url: '#', refs: [] },
  { sha: 'u6v7w8x', message: 'fix: Charts.tsx JSX fragment wrapper', author: 'dex-dev', date: new Date(Date.now() - 30*3600000).toISOString(), url: '#', refs: [] },
  { sha: 'y9z0a1b', message: 'feat: AI recommendations in InsightsView', author: 'aria-design', date: new Date(Date.now() - 48*3600000).toISOString(), url: '#', refs: [] },
  { sha: 'c2d3e4f', message: 'chore: update dependencies and fix type errors', author: 'gage-devops', date: new Date(Date.now() - 72*3600000).toISOString(), url: '#', refs: ['tag: v0.4.1'] },
];

const demoPulls: PullRequest[] = [
  { number: 52, title: 'feat: kanban board advanced filters', state: 'OPEN', author: { login: 'dex-dev' }, createdAt: new Date(Date.now() - 3600000).toISOString(), headRefName: 'feat/kanban-filters', url: '#' },
  { number: 51, title: 'feat: activity timeline with mock data', state: 'MERGED', author: { login: 'dex-dev' }, createdAt: new Date(Date.now() - 12*3600000).toISOString(), headRefName: 'feat/activity-timeline', url: '#' },
  { number: 50, title: 'fix: roadmap Map constructor collision', state: 'MERGED', author: { login: 'dex-dev' }, createdAt: new Date(Date.now() - 24*3600000).toISOString(), headRefName: 'fix/roadmap-map', url: '#' },
  { number: 49, title: 'feat: notification preferences with persistence', state: 'MERGED', author: { login: 'dex-dev' }, createdAt: new Date(Date.now() - 48*3600000).toISOString(), headRefName: 'feat/notification-prefs', url: '#' },
  { number: 48, title: 'refactor: URL sync for chat sub-routes', state: 'OPEN', author: { login: 'river-sm' }, createdAt: new Date(Date.now() - 2*3600000).toISOString(), headRefName: 'feat/url-sync-chat', url: '#' },
];

const demoIssues: Issue[] = [
  { number: 23, title: 'Dashboard shows skeleton forever without API', state: 'open', author: { login: 'pax-po' }, createdAt: new Date(Date.now() - 6*3600000).toISOString(), labels: [{ name: 'bug', color: 'EF4444' }, { name: 'P1', color: 'FF6B6B' }], url: '#' },
  { number: 22, title: 'Add mock data for all views', state: 'open', author: { login: 'pax-po' }, createdAt: new Date(Date.now() - 12*3600000).toISOString(), labels: [{ name: 'enhancement', color: '3B82F6' }], url: '#' },
  { number: 21, title: 'Browser back navigation in chat', state: 'closed', author: { login: 'river-sm' }, createdAt: new Date(Date.now() - 48*3600000).toISOString(), labels: [{ name: 'bug', color: 'EF4444' }, { name: 'UX', color: 'A855F7' }], url: '#' },
  { number: 20, title: 'AIOX cockpit theme: font loading fails', state: 'open', author: { login: 'aria-design' }, createdAt: new Date(Date.now() - 72*3600000).toISOString(), labels: [{ name: 'bug', color: 'EF4444' }, { name: 'theme', color: 'F59E0B' }], url: '#' },
  { number: 19, title: 'Knowledge graph visualization needs WebGL', state: 'open', author: { login: 'aria-architect' }, createdAt: new Date(Date.now() - 96*3600000).toISOString(), labels: [{ name: 'enhancement', color: '3B82F6' }, { name: 'P2', color: 'F59E0B' }], url: '#' },
];

export default function GitHubView() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('commits');
  const [demoMode, setDemoMode] = useState(false);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);

  const [loading, setLoading] = useState({ commits: false, pulls: false, issues: false });
  const [errors, setErrors] = useState({ commits: '', pulls: '', issues: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkGitHubStatus = useCallback(async () => {
    try {
      const res = await fetch(`${MONITOR_URL}/github/status`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.connected);
        setUsername(data.username || null);
        return data.connected;
      }
      setIsConnected(false);
      return false;
    } catch {
      setIsConnected(false);
      return false;
    }
  }, []);

  const fetchTab = useCallback(async (tab: TabType) => {
    setLoading((prev) => ({ ...prev, [tab]: true }));
    setErrors((prev) => ({ ...prev, [tab]: '' }));
    try {
      const res = await fetch(`${MONITOR_URL}/github/${tab}`);
      if (!res.ok) throw new Error(`Failed to fetch ${tab}`);
      const data = await res.json();
      if (tab === 'commits') setCommits(data);
      else if (tab === 'pulls') setPulls(data);
      else setIssues(data);
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [tab]: e instanceof Error ? e.message : 'Unknown error',
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  const activateDemoMode = useCallback(() => {
    setDemoMode(true);
    setIsConnected(true);
    setUsername('demo-user');
    setCommits(demoCommits);
    setPulls(demoPulls);
    setIssues(demoIssues);
    setErrors({ commits: '', pulls: '', issues: '' });
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    const connected = await checkGitHubStatus();
    if (connected) {
      setDemoMode(false);
      await Promise.all([fetchTab('commits'), fetchTab('pulls'), fetchTab('issues')]);
    } else {
      activateDemoMode();
    }
    setIsRefreshing(false);
  }, [checkGitHubStatus, fetchTab, activateDemoMode]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Loading state
  if (isConnected === null) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <GlassCard padding="lg" className="text-center max-w-md">
          <RefreshCw size={40} className="text-secondary mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-semibold text-primary mb-2">Checking GitHub...</h2>
        </GlassCard>
      </div>
    );
  }

  if (!isConnected) {
    return null;
  }

  const tabs: { id: TabType; label: string; icon: typeof GitCommit; count?: number }[] = [
    { id: 'commits', label: 'Commits', icon: GitCommit, count: commits.length },
    { id: 'pulls', label: 'Pull Requests', icon: GitPullRequest, count: pulls.length },
    { id: 'issues', label: 'Issues', icon: CircleDot, count: issues.length },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">GitHub</h1>
            {demoMode && (
              <Badge variant="status" status="warning" size="sm">
                Demo
              </Badge>
            )}
          </div>
          <p className="text-secondary text-sm mt-0.5">
            {REPO}
            {username && (
              <span className="text-tertiary ml-2">
                &middot; {username}
              </span>
            )}
          </p>
        </div>
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={refreshAll}
          disabled={isRefreshing}
          leftIcon={
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          }
        >
          Refresh
        </GlassButton>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 glass-subtle rounded-xl mb-4 flex-shrink-0 overflow-x-auto" role="tablist" aria-label="Abas do GitHub">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'glass text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            )}
          >
            <tab.icon size={ICON_SIZES.md} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <Badge variant="count" size="sm">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto glass-scrollbar" tabIndex={0} role="region" aria-label="GitHub content">
        <AnimatePresence mode="wait">
          {activeTab === 'commits' && (
            <CommitsTab
              key="commits"
              commits={commits}
              loading={loading.commits}
              error={errors.commits}
              onRetry={() => fetchTab('commits')}
            />
          )}
          {activeTab === 'pulls' && (
            <PullsTab
              key="pulls"
              pulls={pulls}
              loading={loading.pulls}
              error={errors.pulls}
              onRetry={() => fetchTab('pulls')}
            />
          )}
          {activeTab === 'issues' && (
            <IssuesTab
              key="issues"
              issues={issues}
              loading={loading.issues}
              error={errors.issues}
              onRetry={() => fetchTab('issues')}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Commits Tab ────────────────────────────────────────────
function CommitsTab({
  commits,
  loading,
  error,
  onRetry,
}: {
  commits: Commit[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) return <TabLoader />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (commits.length === 0) {
    return (
      <EmptyState
        icon={<GitCommit size={32} />}
        title="No commits found"
        description="No recent commits in the repository."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="pb-6"
    >
      <GlassCard padding="md">
        <SectionLabel count={commits.length}>Commits</SectionLabel>
        <div className="space-y-1">
          {commits.map((commit, index) => (
            <motion.div
              key={commit.sha}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => window.open(commit.url, '_blank')}
              className="flex items-start justify-between gap-3 glass-subtle rounded-xl p-3 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <GitCommit size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-tertiary">{commit.sha}</span>
                    <span className="text-sm font-medium text-primary truncate">
                      {commit.message}
                    </span>
                    {commit.refs?.length > 0 &&
                      commit.refs.map((ref) => <RefBadge key={ref} refName={ref} />)}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-tertiary">
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {commit.author}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-tertiary flex-shrink-0 whitespace-nowrap">
                {formatRelativeTime(commit.date)}
              </span>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Pull Requests Tab ──────────────────────────────────────
function PullsTab({
  pulls,
  loading,
  error,
  onRetry,
}: {
  pulls: PullRequest[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) return <TabLoader />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (pulls.length === 0) {
    return (
      <EmptyState
        icon={<GitPullRequest size={32} />}
        title="No open pull requests"
        description="There are no open PRs in this repository."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="pb-6"
    >
      <GlassCard padding="md">
        <SectionLabel count={pulls.length}>Pull Requests</SectionLabel>
        <div className="space-y-1">
          {pulls.map((pr, index) => (
            <motion.div
              key={pr.number}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => window.open(pr.url, '_blank')}
              className="flex items-start justify-between gap-3 glass-subtle rounded-xl p-3 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <GitPullRequest size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-tertiary font-mono">#{pr.number}</span>
                    <span className="text-sm font-medium text-primary truncate">{pr.title}</span>
                    <PrStateBadge state={pr.state} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-tertiary">
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {pr.author.login}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch size={10} />
                      <span className="font-mono">{pr.headRefName}</span>
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-tertiary flex-shrink-0 whitespace-nowrap">
                {formatRelativeTime(pr.createdAt)}
              </span>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Issues Tab ─────────────────────────────────────────────
function IssuesTab({
  issues,
  loading,
  error,
  onRetry,
}: {
  issues: Issue[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) return <TabLoader />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={<CircleDot size={32} />}
        title="No open issues"
        description="There are no open issues in this repository."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="pb-6"
    >
      <GlassCard padding="md">
        <SectionLabel count={issues.length}>Issues</SectionLabel>
        <div className="space-y-1">
          {issues.map((issue, index) => (
            <motion.div
              key={issue.number}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => window.open(issue.url, '_blank')}
              className="flex items-start justify-between gap-3 glass-subtle rounded-xl p-3 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <CircleDot size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-tertiary font-mono">#{issue.number}</span>
                    <span className="text-sm font-medium text-primary truncate">{issue.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {issue.labels.slice(0, 3).map((label) => (
                      <span
                        key={label.name}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                    <span className="text-xs text-tertiary flex items-center gap-1">
                      <User size={11} />
                      {issue.author.login}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-tertiary flex-shrink-0 whitespace-nowrap">
                {formatRelativeTime(issue.createdAt)}
              </span>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Helpers ────────────────────────────────────────────────
function RefBadge({ refName }: { refName: string }) {
  const isHead = refName.startsWith('HEAD');
  const isTag = refName.startsWith('tag: ');
  const isOrigin = refName.startsWith('origin/');

  let displayName = refName;
  if (isHead) {
    const match = refName.match(/HEAD -> (.+)/);
    displayName = match ? match[1] : 'HEAD';
  }
  if (isTag) displayName = refName.replace('tag: ', '');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0',
        isTag
          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
          : isHead
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            : isOrigin
              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
      )}
    >
      <GitBranch size={10} />
      {displayName}
    </span>
  );
}

function PrStateBadge({ state }: { state: string }) {
  const s = state.toLowerCase();
  if (s === 'open') return <Badge variant="status" status="success" size="sm">Open</Badge>;
  if (s === 'merged') return <Badge variant="status" status="online" size="sm">Merged</Badge>;
  return <Badge variant="status" status="offline" size="sm">Closed</Badge>;
}

function TabLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center py-16"
    >
      <RefreshCw size={24} className="text-secondary animate-spin" />
    </motion.div>
  );
}

function TabError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <EmptyState
        type="error"
        title="Failed to load"
        description={message}
        action={{ label: 'Retry', onClick: onRetry, variant: 'primary' }}
      />
    </motion.div>
  );
}
