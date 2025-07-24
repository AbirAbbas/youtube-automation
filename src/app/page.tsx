import VideoIdeaGenerator from './components/VideoIdeaGenerator';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
      <VideoIdeaGenerator />
    </main>
  );
}
