// =================================================================
// FILE JAVASCRIPT GLOBAL (global.js)
// Berisi semua logika yang digunakan bersama di semua halaman.
// =================================================================

// 1. Inisialisasi Klien Supabase (HANYA DI SINI)
const SUPABASE_URL = 'https://ntvzirfulfjczoothgza.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dnppcmZ1bGZqY3pvb3RoZ3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzYxNTksImV4cCI6MjA3NzMxMjE1OX0.EggNCXBCuhuxU6o_aqfz5DzmRzGAcRg710WXbesOZhQ';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Logika untuk Login (TERPUSAT DI SINI)
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginModalElement = document.getElementById('loginModal');
    if (!loginForm || !loginModalElement) return; // Hanya jalan jika ada modal login

    const loginModal = new bootstrap.Modal(loginModalElement);
    const loginError = document.getElementById('login-error');

    // Event listener untuk membersihkan form setiap kali modal login dibuka
    loginModalElement.addEventListener('show.bs.modal', () => {
        loginForm.reset();
        loginError.classList.add('d-none');
    });

    // Logika untuk toggle show/hide password
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('login-password');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Logika Submit Form Login
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const loginButton = document.getElementById('login-button');
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logging in...';
        loginError.classList.add('d-none');

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        let loggedIn = false;
        let userData = null;

        // 1. Cek sebagai Super Admin (Wakasis)
        const { data: wakaData } = await supabaseClient
            .from('tabelwakasis')
            .select('nama, photo, password')
            .eq('nama', username)
            .eq('password', password)
            .single();

        if (wakaData) {
            userData = { username: wakaData.nama, photo: wakaData.photo, role: 'superadmin' };
            loggedIn = true;
        } else {
            // 2. Jika bukan Wakasis, cek sebagai Admin biasa
            const { data: adminData } = await supabaseClient
                .from('tabeladmin')
                .select('username, photo, password')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (adminData) {
                userData = { username: adminData.username, photo: adminData.photo, role: 'admin' };
                loggedIn = true;
            }
        }

        if (loggedIn) {
            sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
            // Panggil loadSchoolIdentity SECARA EKSPLISIT sebelum reload
            await loadSchoolIdentity(); 
            window.location.reload(); // Baru reload halaman
        } else {
            loginError.classList.remove('d-none');
        }

        loginButton.disabled = false;
        loginButton.innerHTML = 'Login';
    });
});

// 3. Fungsi untuk mengisi dropdown username di modal login (TERPUSAT DI SINI)
async function populateLoginUsernames() {
    const usernameSelect = document.getElementById('login-username');
    if (!usernameSelect) return;

    usernameSelect.innerHTML = '<option value="" selected disabled>Memuat username...</option>';
    try {
        const [wakaRes, adminRes] = await Promise.all([
            supabaseClient.from('tabelwakasis').select('nama'),
            supabaseClient.from('tabeladmin').select('username')
        ]);

        const wakaUsernames = wakaRes.data ? wakaRes.data.map(u => u.nama) : [];
        const adminUsernames = adminRes.data ? adminRes.data.map(u => u.username) : [];

        const allUsernames = [...new Set([...wakaUsernames, ...adminUsernames])].filter(Boolean).sort();

        usernameSelect.innerHTML = '<option value="" selected disabled>Pilih username...</option>';
        allUsernames.forEach(username => {
            usernameSelect.innerHTML += `<option value="${username}">${username}</option>`;
        });
    } catch (error) {
        console.error('Gagal memuat daftar username:', error);
        usernameSelect.innerHTML = '<option value="">Gagal memuat</option>';
    }
}

// 4. Fungsi untuk memeriksa status login dan mengatur UI (TERPUSAT DI SINI)
function checkLoginStatus() {
    const loggedInUserJSON = sessionStorage.getItem('loggedInUser');
    const userAvatar = document.getElementById('user-avatar');
    const userInfo = document.getElementById('user-info');
    const loginPrompt = document.getElementById('login-prompt');
    const adminMenuItem = document.getElementById('admin-menu-item');
    const identitasSekolahMenuItem = document.getElementById('identitas-sekolah-menu-item');
    const profilWakaMenuItem = document.getElementById('profil-waka-menu-item');
    const pengaturanDataMenuItem = document.getElementById('pengaturan-data-menu-item');

    if (loggedInUserJSON) {
        const userData = JSON.parse(loggedInUserJSON);
        const userNameDiv = userInfo.querySelector('.user-name');

        userAvatar.src = userData.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        userNameDiv.textContent = userData.username;

        userInfo.classList.remove('d-none');
        loginPrompt.classList.add('d-none');

        // Sembunyikan semua menu admin terlebih dahulu
        [adminMenuItem, identitasSekolahMenuItem, profilWakaMenuItem, pengaturanDataMenuItem].forEach(item => item?.classList.add('d-none'));

        // Tampilkan menu berdasarkan peran (role)
        if (userData.role === 'superadmin') {
            [adminMenuItem, identitasSekolahMenuItem, profilWakaMenuItem, pengaturanDataMenuItem].forEach(item => item?.classList.remove('d-none'));
        }
    } else {
        // Pastikan semua menu admin disembunyikan jika tidak ada yang login
        [adminMenuItem, identitasSekolahMenuItem, profilWakaMenuItem, pengaturanDataMenuItem].forEach(item => item?.classList.add('d-none'));
    }
}

// 5. Logika Logout (TERPUSAT DI SINI)
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            // 1. Hapus data user dan data identitas sekolah dari session
            sessionStorage.removeItem('loggedInUser');
            sessionStorage.removeItem('schoolIdentity');

            // 2. Panggil loadSchoolIdentity() lagi untuk mereset UI ke default
            loadSchoolIdentity();

            alert('Anda telah berhasil logout.');
            window.location.href = 'index.html';
        });
    }
});

// 6. Fungsi untuk memuat identitas sekolah (TERPUSAT DI SINI)
async function loadSchoolIdentity() {
    // Definisikan nilai default yang akan digunakan saat logout atau tidak ada data
    const DEFAULT_SCHOOL_NAME = "Manajemen Kesiswaan";
    const DEFAULT_LOGO = "logo.png"; // Pastikan file ini ada
    const DEFAULT_ADDRESS = "Alamat Sekolah";
    const DEFAULT_COPYRIGHT_HOLDER = "Kenji Studio Developer";

    const identityDataJSON = sessionStorage.getItem('schoolIdentity');
    let identityData = null;

    if (identityDataJSON) {
        // 1. Jika data ada di cache (sessionStorage), gunakan itu.
        identityData = JSON.parse(identityDataJSON);
    } else {
        // 2. Jika tidak ada di cache, ambil dari database Supabase.
        console.log("Memuat identitas sekolah dari database...");
        const { data: dbData, error } = await supabaseClient
            .from('tabelidentitas')
            .select('*')
            .limit(1)
            .single();

        if (dbData) {
            identityData = dbData;
            // 3. Simpan data yang baru diambil ke cache untuk halaman berikutnya.
            sessionStorage.setItem('schoolIdentity', JSON.stringify(identityData));
        } else if (error) {
            console.error("Gagal memuat identitas sekolah dari database:", error.message);
        }
    }

    // 4. Tentukan nilai yang akan ditampilkan berdasarkan ada atau tidaknya data
    let schoolName, schoolLogo, schoolAddress, copyrightHolder;

    if (identityData) {
        schoolName = identityData.nama_sekolah || DEFAULT_SCHOOL_NAME;
        schoolLogo = identityData.logo_sekolah || DEFAULT_LOGO;
        schoolAddress = identityData.alamat || DEFAULT_ADDRESS;
        copyrightHolder = schoolName;
    } else {
        schoolName = DEFAULT_SCHOOL_NAME;
        schoolLogo = DEFAULT_LOGO;
        schoolAddress = DEFAULT_ADDRESS;
        copyrightHolder = DEFAULT_COPYRIGHT_HOLDER;
    }

    // 5. Selalu perbarui UI dengan nilai yang sudah ditentukan (baik dari data asli atau default)
    document.querySelectorAll('.navbar-brand strong').forEach(el => el.textContent = schoolName);
    document.querySelectorAll('.navbar-brand img').forEach(el => el.src = schoolLogo);
    document.querySelectorAll('#footer-school-name').forEach(el => el.textContent = schoolName);
    document.querySelectorAll('#footer-school-address').forEach(el => el.textContent = schoolAddress);
    document.querySelectorAll('footer small').forEach(el => el.innerHTML = `&copy; ${new Date().getFullYear()} ${copyrightHolder}. All Rights Reserved.`);
}