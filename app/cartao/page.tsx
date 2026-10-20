"use client";

import { FormEvent, useState } from "react";
import NextImage from "next/image";
import NavigationMenu from "@/components/navigation-menu";

type CustomerCard = { name: string; balance: number };
type CardEvent = { id: string; type: string; created: string; delta: number };

export default function CustomerCardPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [customer, setCustomer] = useState<CustomerCard | null>(null);
  const [events, setEvents] = useState<CardEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{11}$/.test(phone)) {
      setError("Informe um WhatsApp com exatamente 11 dígitos.");
      return;
    }
    setBusy(true);
    setError("");
    setCustomer(null);
    try {
      const response = await fetch("/api/customer/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await response.json() as {
        error?: string;
        customer?: CustomerCard;
        events?: CardEvent[];
      };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível consultar o cartão.");
      if (!data.customer || !data.events) throw new Error("Resposta inválida ao consultar o cartão.");
      setCustomer(data.customer);
      setEvents(data.events);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar o cartão.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="customer-page">
    <NavigationMenu fidelidadeHref="https://magisserie.vercel.app/cartao" />
    <section className="customer-content">
      <span className="eyebrow">CLUBE MAGISSERIE</span>
      <h1>Seu cartão, <em>cheio de magia.</em></h1>
      <p>Informe seu WhatsApp e o PIN que recebeu da cozinheira para ver seus selos.</p>
      <form className="lookup-form" onSubmit={lookup}>
        <label>WhatsApp<input required type="tel" inputMode="numeric" pattern="[0-9]{11}" minLength={11} maxLength={11} autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="81999999999" title="Digite exatamente 11 dígitos, incluindo o DDD." /></label>
        <label>PIN de 6 dígitos<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
        {error && <p role="alert" className="form-error">{error}</p>}
        <button disabled={busy} type="submit">{busy ? "Consultando…" : "Ver meu cartão"}</button>
      </form>
      {customer && <section className="customer-result">
        <div className="customer-title"><div><span className="eyebrow">SEU CARTÃO</span><h2>{customer.name}</h2></div><span className="tag">{customer.balance >= 10 ? "Mimo liberado ✦" : `${Math.max(0, Math.min(10, customer.balance))} de 10 selos`}</span></div>
        <LoyaltyCard filled={Math.max(0, Math.min(10, customer.balance))} />
        <button className="download-button" onClick={() => { try { downloadCard(customer.name, customer.balance); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível gerar a imagem."); } }}>Baixar cartão como imagem</button>
        <section className="history"><div className="aside-title"><h2>Histórico de compras</h2><span>{events.length} registros</span></div>{events.length ? events.map((event) => <div className="event" key={event.id}><span className="event-icon">{event.type === "stamp" ? "✦" : event.type === "redeem" ? "♡" : "↶"}</span><div><b>{event.type === "stamp" ? "Compra registrada" : event.type === "redeem" ? "Mimo resgatado" : "Selo corrigido"}</b><small>{new Date(event.created).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small></div><strong>{event.delta > 0 ? "+" : ""}{event.delta}</strong></div>) : <p className="muted">Seu histórico aparecerá aqui.</p>}</section>
      </section>}
    </section>
    <footer>Magisserie <span>·</span> Feito de cookies, carinho e magia.</footer>
  </main>;
}

function LoyaltyCard({ filled }: { filled: number }) {
  return <div className="loyalty"><div className="card-top"><NextImage className="card-logo" src="/brand/logo.png" width={1000} height={1000} unoptimized alt="Logo da Magisserie" /><span>CARTÃO<br />FIDELIDADE ✦</span></div><p className="sweet">Cada compra deixa a vida mais doce.</p><div className="stamps">{Array.from({ length: 10 }, (_, index) => <div className="stamp-wrap" key={index}><div className={`stamp ${index < filled ? "filled" : ""}`}>{index < filled ? <NextImage src="/selo.png" width={100} height={100} unoptimized alt="Selo da bruxinha Magisserie" /> : <span>{index === 9 ? "✦" : "+"}</span>}</div><small>{index + 1}</small></div>)}</div><p className="card-footer">Complete os 10 selos e ganhe um mimo!</p></div>;
}

function downloadCard(name: string, balance: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu preparar a imagem.");

  context.fillStyle = "#fef7ef";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#fea579";
  context.lineWidth = 8;
  context.strokeRect(30, 30, 1140, 700);
  const logoImage = document.querySelector<HTMLImageElement>(".customer-result .card-logo");
  if (!logoImage || !logoImage.complete || !logoImage.naturalWidth) {
    throw new Error("Aguarde a logo aparecer no cartão e tente novamente.");
  }
  drawContainedImage(context, logoImage, 70, 48, 170, 155);
  context.fillStyle = "#21687a";
  context.textAlign = "right";
  context.font = "bold 24px Georgia";
  context.fillText("CARTÃO FIDELIDADE ✦", 1120, 120);
  context.textAlign = "center";
  let nameFontSize = 60;
  context.font = `bold ${nameFontSize}px Georgia`;
  while (context.measureText(name).width > 1040 && nameFontSize > 28) {
    nameFontSize -= 2;
    context.font = `bold ${nameFontSize}px Georgia`;
  }
  context.fillText(name, 600, 220);
  context.font = "23px Georgia";
  context.fillText("Cada compra deixa a vida mais doce.", 600, 270);

  const stampImage = balance > 0
    ? document.querySelector<HTMLImageElement>(".customer-result .stamp img")
    : null;
  if (balance > 0 && (!stampImage || !stampImage.complete || !stampImage.naturalWidth)) {
    throw new Error("Aguarde o selo aparecer no cartão e tente novamente.");
  }
  const filled = Math.max(0, Math.min(10, balance));
  for (let index = 0; index < 10; index++) {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = 180 + column * 210;
    const y = 390 + row * 135;
    if (index < filled && stampImage) {
      drawContainedImage(context, stampImage, x - 65, y - 65, 130, 130);
    } else {
      context.beginPath();
      context.arc(x, y, 42, 0, Math.PI * 2);
      context.strokeStyle = "#21687a";
      context.lineWidth = 4;
      context.stroke();
      context.fillStyle = "#21687a70";
      context.font = "35px Georgia";
      context.textAlign = "center";
      context.fillText(index === 9 ? "✦" : "+", x, y + 12);
    }
    context.fillStyle = "#21687a";
    context.font = "18px Georgia";
    context.textAlign = "center";
    context.fillText(String(index + 1), x, y + 70);
  }
  context.font = "25px Georgia";
  context.fillText("Complete os 10 selos e ganhe um mimo!", 600, 690);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = "cartao-magisserie.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
}
