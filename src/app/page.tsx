import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
      <div className="text-center p-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-blue-600 mb-4">
          FinPlan
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-md mx-auto">
          Pare de apenas acompanhar seu dinheiro. Comece a planejar o que fazer com ele.
        </p>
        <Link 
          href="/login" 
          className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
        >
          Acessar meu painel
        </Link>
      </div>
    </div>
  );
}