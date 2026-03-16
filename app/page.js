import MultiStepForm from "./components/MultiStepForm";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-gray-900/5 backdrop-blur-xl sm:p-10">
         
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} RadCred. All rights reserved.
        </p>
      </div>
    </main>
  );
}
