/* ============================================================
   js/auth.js  —  Autenticación y arranque
   ============================================================ */

async function loginWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
  if (error) showToast('Error al iniciar sesión: ' + error.message, true);
}

async function logout() {
  await db.auth.signOut();
  currentUser = null;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('bottom-nav').style.display = 'none';
}

document.getElementById('btn-google-login').addEventListener('click', loginWithGoogle);
document.querySelectorAll('[data-logout]').forEach(btn => btn.addEventListener('click', logout));
document.getElementById('btn-logout')?.addEventListener('click', logout);

db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    registrarNotificaciones();
    if (event === 'SIGNED_IN') {
      document.getElementById('bottom-nav').style.display = 'flex';
      db.from('equipos').select('nombre_equipo, equipo_favorito')
        .eq('user_id', currentUser.id).single()
        .then(({ data: equipoData }) => {
          if (!equipoData?.nombre_equipo) {
            document.getElementById('modal-nombre-equipo').classList.add('open');
          } else if (!equipoData?.equipo_favorito) {
            document.getElementById('modal-equipo-favorito').classList.add('open');
          } else {
            goTo('home');
          }
        });
    }
  } else {
    currentUser = null;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-login').classList.add('active');
    document.getElementById('bottom-nav').style.display = 'none';
  }
});

(async function init() {
  document.getElementById('bottom-nav').style.display = 'none';
  await loadConfig();
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    document.getElementById('bottom-nav').style.display = 'flex';
    const { data: equipoData } = await db.from('equipos')
      .select('nombre_equipo, equipo_favorito')
      .eq('user_id', currentUser.id).single();
    if (!equipoData?.nombre_equipo) {
      document.getElementById('modal-nombre-equipo').classList.add('open');
    } else {
      goTo('home');
    }
  }
})();
