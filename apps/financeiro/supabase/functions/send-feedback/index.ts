import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Sessão não encontrada.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const smtpHost = Deno.env.get('FEEDBACK_SMTP_HOST');
    const smtpPort = Number(Deno.env.get('FEEDBACK_SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('FEEDBACK_SMTP_USER');
    const smtpPassword = Deno.env.get('FEEDBACK_SMTP_PASSWORD');
    const fromEmail = Deno.env.get('FEEDBACK_FROM_EMAIL') || smtpUser;
    if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Supabase não configurado.' }, 500);
    if (!smtpHost || !smtpUser || !smtpPassword || !fromEmail) return json({ error: 'O envio de feedback ainda não foi configurado pelo administrador.' }, 503);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) return json({ error: 'Sessão inválida ou expirada.' }, 401);

    const body = await request.json();
    const message = String(body?.message || '').trim();
    const pageUrl = String(body?.pageUrl || '').trim();
    const workspaceId = String(body?.workspaceId || '').trim();
    if (message.length < 10 || message.length > 5000) return json({ error: 'A mensagem deve ter entre 10 e 5.000 caracteres.' }, 400);
    if (!pageUrl.startsWith('http://') && !pageUrl.startsWith('https://')) return json({ error: 'Tela de origem inválida.' }, 400);

    const { data: membership, error: membershipError } = await supabase
      .from('finance_workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return json({ error: 'Somente administradores da conta podem enviar feedback.' }, 403);
    }

    const safeEmail = escapeHtml(user.email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const safePageUrl = escapeHtml(pageUrl);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transporter.sendMail({
      from: `BASE <${fromEmail}>`,
      to: 'toss@toss.studio',
      replyTo: user.email,
      subject: `Feedback da conta ${user.email}`,
      text: `Conta: ${user.email}\n\nMensagem:\n${message}\n\nTela de origem:\n${pageUrl}`,
      html: `<h2>Feedback da conta ${safeEmail}</h2><p><strong>Mensagem</strong></p><p>${safeMessage}</p><p><strong>Tela de origem</strong><br><a href="${safePageUrl}">${safePageUrl}</a></p>`,
    });
    return json({ ok: true });
  } catch (error) {
    console.error('send-feedback error', error);
    return json({ error: 'Não foi possível enviar o feedback.' }, 500);
  }
});
