import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      navigate('/', { replace: true });
    };
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) go(); });
    const timeout = setTimeout(() => { if (!done) setStatus('error'); }, 6000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      {status === 'loading' ? (
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Iniciando sesión…</p>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No se pudo iniciar sesión automáticamente.</p>
          <button onClick={() => navigate('/login', { replace: true })} style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Ir al login</button>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
