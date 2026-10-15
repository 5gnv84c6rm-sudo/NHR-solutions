/* Supabase client for the public forms.

   Public forms need no account: the anon role may INSERT into enquiries and
   demo_bookings and nothing else — it cannot read a single row back, so one
   visitor cannot see another's submission.

   It also carries account sign-up and sign-in for the platform, so a workspace
   created on a phone opens on a desktop with the same credentials.

   Config comes from supabase-config.js, generated from .env. When it is
   absent the forms fall back to browser storage, as the prototype did. */
window.NHRSupabase = (function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/dist/umd/supabase.js';
  var pending = null;

  function config() { return window.NHR_SUPABASE || {}; }
  function enabled() { var c = config(); return Boolean(c.url && c.key); }

  function client() {
    if (pending) return pending;
    pending = new Promise(function (resolve, reject) {
      var c = config();
      if (!enabled()) { reject(new Error('Supabase is not configured')); return; }
      if (window.supabase && window.supabase.createClient) { resolve(make(c)); return; }
      var tag = document.createElement('script');
      tag.src = CDN;
      tag.async = true;
      tag.onload = function () {
        if (window.supabase && window.supabase.createClient) resolve(make(c));
        else reject(new Error('Supabase library loaded but createClient is missing'));
      };
      tag.onerror = function () { reject(new Error('Could not load the Supabase library')); };
      document.head.appendChild(tag);
    });
    return pending;
  }

  function make(c) {
    // Sessions persist so a signed-in account survives a refresh. Visitors who
    // only submit a form never create one.
    return window.supabase.createClient(c.url, c.key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }

  function insert(table, row) {
    return client().then(function (db) {
      return db.from(table).insert(row).then(function (res) {
        if (res.error) throw new Error(res.error.message || 'The database rejected the submission');
        return true;
      });
    });
  }

  /* ---------- accounts ----------
     Sign-up goes through the signup Edge Function because provisioning a
     workspace needs the service role. Sign-in is plain Supabase Auth, so an
     account created on one device works on any other. */
  function signUpAccount(form) {
    var c = config();
    return fetch(c.url + '/functions/v1/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: c.key },
      body: JSON.stringify(form)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var err = new Error(body.message || 'We could not create that account.');
          err.fields = body.fields || null;
          throw err;
        }
        return body;
      });
    });
  }

  function signIn(email, password) {
    return client().then(function (db) {
      return db.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) {
          // Supabase says "Invalid login credentials" for both a wrong password
          // and an unknown address, which is the right way round: it does not
          // reveal whether an account exists.
          throw new Error(res.error.message === 'Invalid login credentials'
            ? 'That email and password do not match an account.'
            : res.error.message);
        }
        return res.data.user;
      });
    });
  }

  function currentUser() {
    return client().then(function (db) {
      return db.auth.getSession().then(function (res) {
        return (res.data && res.data.session) ? res.data.session.user : null;
      });
    });
  }

  function signOut() {
    return client().then(function (db) { return db.auth.signOut(); }).catch(function () { /* already gone */ });
  }

  function resetPassword(email) {
    return client().then(function (db) {
      return db.auth.resetPasswordForEmail(email).then(function (res) {
        if (res.error) throw new Error(res.error.message);
        return true;
      });
    });
  }

  return {
    enabled: enabled,
    client: client,
    submitEnquiry: function (row) { return insert('enquiries', row); },
    submitDemoBooking: function (row) { return insert('demo_bookings', row); },
    signUpAccount: signUpAccount,
    signIn: signIn,
    signOut: signOut,
    currentUser: currentUser,
    resetPassword: resetPassword
  };
})();
