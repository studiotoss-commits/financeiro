import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthGate from '@base/autenticacao';
import App from './App';
import '@base/design-system/styles.css';
import '@base/autenticacao/styles.css';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><AuthGate appName="NOT" mark="NOT" description="Acompanhe serviços e vencimentos dos seus clientes com a mesma conta do BASE.">{({user,onLogout})=><App key={user.id} user={user} onLogout={onLogout}/>}</AuthGate></React.StrictMode>);
