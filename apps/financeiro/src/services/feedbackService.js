import { supabase } from './supabase';

export async function sendFeedback({ message, pageUrl, workspaceId }) {
  if (!supabase) throw new Error('O serviço de feedback não está configurado.');
  if (!workspaceId) throw new Error('Não foi possível identificar a conta atual.');
  const { data, error } = await supabase.functions.invoke('send-feedback', {
    body: { message, pageUrl, workspaceId },
  });
  if (error) {
    let serverMessage = data?.error;
    if (!serverMessage && error.context) {
      try { serverMessage = (await error.context.json())?.error; } catch { /* resposta sem JSON */ }
    }
    throw new Error(serverMessage || error.message || 'Falha ao enviar o feedback.');
  }
  if (!data?.ok) throw new Error(data?.error || 'Falha ao enviar o feedback.');
  return data;
}
