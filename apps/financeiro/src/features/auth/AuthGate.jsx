import React, { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import { isSupabaseConfigured, supabase } from '../../services/supabase';

function AuthScreen({ children }) {
  return <main className="fx-auth"><section className="fx-auth-card">{children}</section></main>;
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const params = `${window.location.search}${window.location.hash}`;
    return params.includes('type=recovery') || params.includes('recovery=1');
  });
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <AuthScreen><div className="fx-auth-mark">BF</div><p className="fx-auth-eyebrow">BASE Financeiro</p><h1>Conexão pendente</h1><p>O aplicativo está pronto para o banco, mas as variáveis do Supabase ainda não foram configuradas neste ambiente.</p></AuthScreen>;
  }
  if (loading) return <AuthScreen><div className="fx-auth-spinner" /><p>Validando acesso seguro…</p></AuthScreen>;

  if (recoveryMode && session) {
    const updatePassword = async (event) => {
      event.preventDefault();
      setError('');
      if (password.length < 8) {
        setError('A senha precisa ter pelo menos 8 caracteres.');
        return;
      }
      if (password !== passwordConfirmation) {
        setError('As senhas informadas não são iguais.');
        return;
      }
      setSubmitting(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Não foi possível definir a senha. Solicite um novo link e tente novamente.');
      } else {
        setRecoveryMode(false);
        window.history.replaceState({}, '', window.location.pathname);
      }
      setSubmitting(false);
    };

    return <AuthScreen>
      <div className="fx-auth-mark">BF</div><p className="fx-auth-eyebrow">BASE Financeiro</p>
      <h1>Defina sua senha</h1><p>Crie uma senha segura para concluir seu primeiro acesso.</p>
      <form className="fx-auth-form" onSubmit={updatePassword}>
        <label>Nova senha<input className="fx-input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label>Confirmar senha<input className="fx-input" type="password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required /></label>
        {error && <div className="fx-auth-error"><Icon name="alert-circle" size={17} />{error}</div>}
        <button className="fx-modal-save" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Definir senha e entrar'}</button>
      </form>
    </AuthScreen>;
  }

  if (!session) {
    const signIn = async (event) => {
      event.preventDefault(); setSubmitting(true); setError('');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError('E-mail ou senha inválidos. Confira os dados e tente novamente.');
      setSubmitting(false);
    };
    const requestPasswordReset = async (event) => {
      event.preventDefault(); setSubmitting(true); setError(''); setResetSent(false);
      const redirectTo = `${window.location.origin}/configuracoes?recovery=1`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) setError('Não foi possível enviar o link. Confira o e-mail e tente novamente.');
      else setResetSent(true);
      setSubmitting(false);
    };
    if (resetMode) return <AuthScreen>
      <div className="fx-auth-mark">BF</div><p className="fx-auth-eyebrow">BASE Financeiro</p>
      <h1>Recuperar acesso</h1><p>Enviaremos um link seguro para você definir uma nova senha.</p>
      <form className="fx-auth-form" onSubmit={requestPasswordReset}>
        <label>E-mail<input className="fx-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {error && <div className="fx-auth-error"><Icon name="alert-circle" size={17} />{error}</div>}
        {resetSent && <div className="fx-password-success"><Icon name="circle-check" size={17} />Link enviado. Confira também a caixa de spam.</div>}
        <button className="fx-modal-save" type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar link de acesso'}</button>
        <button className="fx-auth-link" type="button" onClick={() => { setResetMode(false); setError(''); setResetSent(false); }}>Voltar para o login</button>
      </form>
    </AuthScreen>;
    return <AuthScreen>
      <div className="fx-auth-mark">BF</div><p className="fx-auth-eyebrow">BASE Financeiro</p>
      <h1>Acesse sua conta</h1><p>Entre para lançar e consultar os dados financeiros da empresa.</p>
      <form className="fx-auth-form" onSubmit={signIn}>
        <label>E-mail<input className="fx-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Senha<input className="fx-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <div className="fx-auth-error"><Icon name="alert-circle" size={17} />{error}</div>}
        <button className="fx-modal-save" type="submit" disabled={submitting}>{submitting ? 'Entrando…' : 'Entrar'}</button>
        <button className="fx-auth-link" type="button" onClick={() => { setResetMode(true); setError(''); }}>Esqueci minha senha</button>
      </form><small>O acesso é liberado pelo administrador do BASE.</small>
    </AuthScreen>;
  }

  return children({
    user: session.user,
    onLogout: () => supabase.auth.signOut(),
    onUpdatePassword: (nextPassword) => supabase.auth.updateUser({ password: nextPassword }),
  });
}
