import type { Metadata } from 'next';
import Leaderboard from './Leaderboard';

export const metadata: Metadata = {
  title: 'Live Leaderboard — HackathonOS',
  description: 'Live hackathon leaderboard: ranked projects and scores, updating in real time.',
};

export default function LeaderboardPage({ params }: { params: { slug: string } }) {
  return <Leaderboard slug={params.slug} />;
}
