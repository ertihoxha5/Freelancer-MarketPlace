import { Link } from "react-router-dom";

function ErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
      <div className="text-center">
        <p className="text-8xl font-semibold text-slate-200">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Faqja nuk u gjet
        </h1>
        <p className="mt-2 text-slate-600">
          Adresa që kërkuat nuk ekziston ose është zhvendosur.
        </p>
      </div>
      <Link
        to="/"
        className="rounded-2xl bg-[#1a3c2e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2a5c46]"
      >
        Kthehu në kryefaqe
      </Link>
    </div>
  );
}

export default ErrorPage;
