"use client";

import { FormEvent, useEffect, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";

type Customer = { id: string; name: string; phone: string; balance: number };
type Event = { id: string; customer: string; type: string; created: string; delta: number };

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [issuedPin, setIssuedPin] = useState("");
  const [pinCustomer, setPinCustomer] = useState("");

  async function refresh() {
    const response = await fetch("/api/loyalty", { cache: "no-store" });
    if (response.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (!response.ok) throw new Error("Não foi possível carregar os clientes.");
    const data = await response.json() as { customers: Customer[]; events: Event[] };
    setCustomers(data.customers);
    setEvents(data.events);
    setSelected((current) => current || data.customers[0]?.id || "");
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (!response.ok) throw new Error("Não foi possível verificar o acesso.");
        const data = await response.json() as { authenticated: boolean };
        if (!active) return;
        setAuthenticated(data.authenticated);
        if (data.authenticated) await refresh();
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Ocorreu um erro.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json() as { error?: string; authenticated?: boolean };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível entrar.");
      setPassword("");
      setAuthenticated(Boolean(data.authenticated));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setCustomers([]);
    setEvents([]);
    setSelected("");
  }

  async function saveCustomerEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCustomer || !/^\d{11}$/.test(editPhone)) {
      setMessage("Informe um WhatsApp com exatamente 11 dígitos.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-customer",
          id: editingCustomer.id,
          name: editName,
          phone: editPhone,
        }),
      });
      const data = await response.json() as { error?: string; phoneChanged?: boolean; pin?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar o cliente.");
      await refresh();
      setEditingCustomer(null);
      if (data.phoneChanged && data.pin) {
        setPinCustomer(editName.trim());
        setIssuedPin(data.pin);
        setMessage("Cliente atualizado. O WhatsApp mudou: entregue o novo PIN ao cliente.");
      } else {
        setMessage("Dados do cliente atualizados.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o cliente.");
    } finally {
      setBusy(false);
    }
  }

  async function action(actionName: string) {
    if (actionName === "create" && !/^\d{11}$/.test(phone.replace(/\D/g, ""))) {
      setMessage("Informe um WhatsApp com exatamente 11 dígitos.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, id: selected, name, phone }),
      });
      const data = await response.json() as { error?: string; id?: string; pin?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      if (actionName === "create" && data.id) setSelected(data.id);
      await refresh();

      if (actionName === "create") {
        setPinCustomer(name.trim());
        setIssuedPin(data.pin ?? "");
        setModal(false);
        setName("");
        setPhone("");
        setMessage("Cliente cadastrado. Entregue o PIN abaixo para liberar a consulta do cartão.");
      } else if (actionName === "reset-pin") {
        setPinCustomer(customers.find((customer) => customer.id === selected)?.name ?? "");
        setIssuedPin(data.pin ?? "");
        setMessage("Novo PIN gerado. O PIN anterior deixou de funcionar.");
      } else {
        setMessage(
          actionName === "stamp"
            ? "Compra registrada com uma pitada de magia!"
            : actionName === "redeem"
              ? "Mimo resgatado! O próximo cartão já pode começar."
              : "Último selo corrigido.",
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  const customer = customers.find((item) => item.id === selected);
  const history = events.filter((event) => event.customer === selected);
  const filled = customer ? Math.max(0, Math.min(10, customer.balance)) : 0;

  if (loading) return <main className="auth-screen"><p>Carregando o clube…</p></main>;
  if (!authenticated) {
    return (
      <main className="auth-screen">
        <form className="modal login-card" onSubmit={login}>
          <Link className="brand-image-link" href="/" aria-label="Magisserie — Início"><NextImage src="/brand/nome.png" width={180} height={56} alt="Magisserie" priority /></Link>
          <span className="eyebrow">ACESSO DA COZINHA</span>
          <h1>Painel administrativo</h1>
          <p>Entre com a senha compartilhada das administradoras.</p>
          <label>Senha<input autoFocus required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {message && <p role="alert" className="form-error">{message}</p>}
          <button disabled={busy} type="submit">{busy ? "Entrando…" : "Entrar no painel"}</button>
          <Link className="customer-link" href="/cartao">Sou cliente — consultar meu cartão</Link>
        </form>
      </main>
    );
  }

  return (
    <main>
      <header>
        <Link className="brand-image-link" href="/" aria-label="Magisserie — Início"><NextImage src="/brand/nome.png" width={180} height={56} alt="Magisserie" priority /></Link>
        <nav className="header-actions">
          <Link className="customer-link" href="/cartao">Área do cliente</Link>
          <button className="secondary" onClick={logout}>Sair</button>
          <button onClick={() => { setIssuedPin(""); setModal(true); }}>＋ Novo cliente</button>
        </nav>
      </header>
      <section className="intro">
        <div><span className="eyebrow">CLUBE MAGISSERIE</span><h1>Quem volta merece<br /><em>um pouco mais de magia.</em></h1><p>Cada compra, um selo. Cada cartão completo, um mimo.</p></div>
        <div className="summary"><strong>{customers.length}</strong><span>clientes no clube</span><div /><strong>{customers.filter((item) => item.balance >= 10).length}</strong><span>mimos disponíveis</span></div>
      </section>
      <div className="workspace">
        <aside>
          <div className="aside-title"><h2>Seus clientes</h2><span>{customers.length}</span></div>
          <label className="search">⌕ <input aria-label="Buscar cliente" placeholder="Nome ou WhatsApp" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="client-list">
            {customers.filter((item) => (item.name + " " + item.phone).toLowerCase().includes(query.toLowerCase())).map((item) => (
              <button className={`client ${selected === item.id ? "active" : ""}`} key={item.id} onClick={() => { setSelected(item.id); setIssuedPin(""); }}>
                <span className="avatar">{item.name.charAt(0).toUpperCase()}</span>
                <span><b>{item.name}</b><small>{item.balance >= 10 ? "✦ Mimo disponível" : `${item.balance}/10 selos`}</small></span>
                <span className="arrow">›</span>
              </button>
            ))}
            {!customers.length && <div className="empty-small">Seu clube começa com o primeiro cliente.<button className="text-button" onClick={() => setModal(true)}>Cadastrar cliente →</button></div>}
          </div>
        </aside>
        <section className="detail">
          {customer ? <>
            <div className="customer-title"><div><span className="eyebrow">CARTÃO DO CLIENTE</span><h2>{customer.name}</h2><p>WhatsApp · {customer.phone}</p></div><span className="tag">{customer.balance >= 10 ? "Mimo liberado ✦" : `${filled} de 10 selos`}</span></div>
            <LoyaltyCard filled={filled} />
            <div className="actions">
              <button className="secondary" disabled={busy} onClick={() => { setEditName(customer.name); setEditPhone(customer.phone); setEditingCustomer(customer); setMessage(""); }}>Editar cliente</button>
              <button disabled={busy} onClick={() => action("stamp")}>✦ Registrar compra</button>
              <button className="secondary" disabled={busy || customer.balance < 10} onClick={() => action("redeem")}>Resgatar mimo</button>
              <button className="text-button" disabled={busy || customer.balance < 1} onClick={() => { if (confirm("Remover um selo lançado por engano?")) void action("undo"); }}>Corrigir selo</button>
              <button className="text-button" disabled={busy} onClick={() => void action("reset-pin")}>Gerar novo PIN</button>
            </div>
            {issuedPin && <div className="pin-panel" role="status"><div><b>PIN de acesso de {pinCustomer}</b><p>Entregue este PIN ao cliente. Ele só é exibido agora; um novo PIN pode ser gerado se necessário.</p></div><strong>{issuedPin}</strong><button className="secondary" onClick={() => { void navigator.clipboard.writeText(issuedPin).then(() => setMessage("PIN copiado."), () => setMessage("Não foi possível copiar o PIN.")); }}>Copiar PIN</button><button className="text-button" onClick={() => setIssuedPin("")}>Fechar</button></div>}
            <section className="history"><div className="aside-title"><h2>Histórico de magia</h2><span>{history.length} registros</span></div>{history.length ? history.map((event) => <div className="event" key={event.id}><span className="event-icon">{event.type === "stamp" ? "✦" : event.type === "redeem" ? "♡" : "↶"}</span><div><b>{event.type === "stamp" ? "Compra registrada" : event.type === "redeem" ? "Mimo resgatado" : "Selo corrigido"}</b><small>{new Date(event.created).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small></div><strong>{event.delta > 0 ? "+" : ""}{event.delta} {Math.abs(event.delta) === 1 ? "selo" : "selos"}</strong></div>) : <p className="muted">As compras deste cliente aparecerão aqui.</p>}</section>
          </> : <div className="welcome"><span>✦</span><h2>Um clube feito de<br />pequenos encantos.</h2><p>Cadastre seu primeiro cliente para começar a carimbar o cartão com a bruxinha da Magisserie.</p><button onClick={() => setModal(true)}>＋ Cadastrar primeiro cliente</button></div>}
        </section>
      </div>
      {message && <div role="status" className="toast">{message}<button aria-label="Fechar mensagem" onClick={() => setMessage("")}>×</button></div>}
      <footer>Magisserie <span>·</span> Feito de cookies, carinho e magia.</footer>
      {modal && <div className="overlay"><form className="modal" onSubmit={(event) => { event.preventDefault(); void action("create"); }}><button className="close" type="button" aria-label="Fechar" onClick={() => setModal(false)}>×</button><span className="eyebrow">BOAS-VINDAS AO CLUBE</span><h2>Mais alguém para<br />adoçar o dia.</h2><label>Nome do cliente<input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Como a pessoa se chama?" /></label><label>WhatsApp<input required type="tel" inputMode="numeric" pattern="[0-9]{11}" minLength={11} maxLength={11} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="81999999999" title="Digite exatamente 11 dígitos, incluindo o DDD." /></label><p>Um cartão individual com compras salvas. Um PIN será gerado para entregar ao cliente.</p><button disabled={busy} type="submit">{busy ? "Salvando…" : "Criar cartão fidelidade"}</button></form></div>}
      {editingCustomer && <div className="overlay"><form className="modal" onSubmit={saveCustomerEdits}><button className="close" type="button" aria-label="Fechar" onClick={() => setEditingCustomer(null)}>×</button><span className="eyebrow">DADOS DO CLIENTE</span><h2>Editar cadastro</h2><label>Nome do cliente<input autoFocus required maxLength={100} value={editName} onChange={(event) => setEditName(event.target.value)} /></label><label>WhatsApp<input required type="tel" inputMode="numeric" pattern="[0-9]{11}" minLength={11} maxLength={11} value={editPhone} onChange={(event) => setEditPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="81999999999" title="Digite exatamente 11 dígitos, incluindo o DDD." /></label><p>Se alterar o WhatsApp, será gerado um novo PIN de acesso para o cliente.</p><button disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar alterações"}</button></form></div>}
    </main>
  );
}

function LoyaltyCard({ filled }: { filled: number }) {
  return <div className="loyalty"><div className="card-top"><NextImage className="card-logo" src="/brand/logo.png" width={1000} height={1000} unoptimized alt="Logo da Magisserie" /><span>CARTÃO<br />FIDELIDADE ✦</span></div><p className="sweet">Cada compra deixa a vida mais doce.</p><div className="stamps">{Array.from({ length: 10 }, (_, index) => <div className="stamp-wrap" key={index}><div className={`stamp ${index < filled ? "filled" : ""}`}>{index < filled ? <NextImage src="/selo.png" width={100} height={100} unoptimized alt="Selo da bruxinha Magisserie" /> : <span>{index === 9 ? "✦" : "+"}</span>}</div><small>{index + 1}</small></div>)}</div><p className="card-footer">Complete os 10 selos e ganhe um mimo!</p></div>;
}
