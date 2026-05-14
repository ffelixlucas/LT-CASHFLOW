"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f6f5f1",
          color: "#18211f",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <img
            alt="LT CashFlow"
            height={64}
            src="/brand/ltcashflow-logo-horizontal-1-tight.png"
            style={{ height: "auto", width: "min(260px, 85vw)" }}
            width={260}
          />
          <h1 style={{ fontSize: "1.2rem", fontWeight: 600, marginTop: 28, marginBottom: 8 }}>
            Não foi possível carregar
          </h1>
          <p style={{ color: "#6f766f", fontSize: "0.95rem", lineHeight: 1.55, margin: 0 }}>
            Ocorreu um erro no servidor. Tente recarregar ou volte em instantes.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 22,
              padding: "10px 22px",
              background: "#1f7a68",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
