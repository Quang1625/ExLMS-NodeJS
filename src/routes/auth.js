const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_dev';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signAccess(user) {
    return jwt.sign(
        { userId: user._id, role: user.role, email: user.email },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES }
    );
}

function signRefresh(user) {
    return jwt.sign(
        { userId: user._id },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES }
    );
}

const REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', async (req, res, next) => {
    try {
        const { email, password, full_name, role } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'email, password và full_name là bắt buộc' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return res.status(409).json({ error: 'Email đã được sử dụng' });

        // INSTRUCTOR needs admin approval → PENDING; others → ACTIVE
        const requestedRole = ['INSTRUCTOR', 'STUDENT'].includes(role) ? role : 'STUDENT';
        const initialStatus = requestedRole === 'INSTRUCTOR' ? 'PENDING' : 'ACTIVE';

        const password_hash = await bcrypt.hash(password, 12);

        const user = new User({
            email: email.toLowerCase(),
            password_hash,
            full_name,
            role: requestedRole,
            status: initialStatus,
            email_verified: false
        });
        await user.save();

        const userObj = user.toObject();
        delete userObj.password_hash;
        delete userObj.sessions;

        res.status(201).json({
            message: requestedRole === 'INSTRUCTOR'
                ? 'Đăng ký thành công. Tài khoản Giảng viên đang chờ Admin phê duyệt.'
                : 'Đăng ký thành công.',
            user: userObj
        });
    } catch (err) { next(err); }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email và password là bắt buộc' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

        // Account lock check
        if (user.locked_until && user.locked_until > new Date()) {
            return res.status(423).json({ error: `Tài khoản bị khóa đến ${user.locked_until.toISOString()}` });
        }

        if (!user.password_hash) {
            return res.status(400).json({ error: 'Tài khoản này dùng OAuth, vui lòng đăng nhập bằng Google/Microsoft' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            user.failed_login_count = (user.failed_login_count || 0) + 1;
            if (user.failed_login_count >= 5) {
                user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // lock 15 min
            }
            await user.save();
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        if (user.status === 'PENDING') {
            return res.status(403).json({ error: 'Tài khoản đang chờ Admin phê duyệt' });
        }
        if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
            return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
        }

        // Reset failed login counter
        user.failed_login_count = 0;
        user.locked_until = undefined;
        user.last_login_at = new Date();

        const access_token = signAccess(user);
        const refresh_token = signRefresh(user);

        // Save session
        user.sessions.push({
            refresh_token,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            expires_at: new Date(Date.now() + REFRESH_MS)
        });
        await user.save();

        res.json({
            access_token,
            refresh_token,
            expires_in: ACCESS_EXPIRES,
            user: {
                _id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                avatar_key: user.avatar_key,
                bio: user.bio,
                created_at: user.created_at
            }
        });
    } catch (err) { next(err); }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) return res.status(400).json({ error: 'refresh_token là bắt buộc' });

        let payload;
        try {
            payload = jwt.verify(refresh_token, REFRESH_SECRET);
        } catch {
            return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' });
        }

        const user = await User.findById(payload.userId);
        if (!user) return res.status(401).json({ error: 'User không tồn tại' });

        const sessionIdx = user.sessions.findIndex(s => s.refresh_token === refresh_token);
        if (sessionIdx === -1) return res.status(401).json({ error: 'Session không hợp lệ' });

        // Rotate: remove old, insert new
        user.sessions.splice(sessionIdx, 1);

        const new_access_token = signAccess(user);
        const new_refresh_token = signRefresh(user);

        user.sessions.push({
            refresh_token: new_refresh_token,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            expires_at: new Date(Date.now() + REFRESH_MS)
        });
        await user.save();

        res.json({ access_token: new_access_token, refresh_token: new_refresh_token });
    } catch (err) { next(err); }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) return res.status(400).json({ error: 'refresh_token là bắt buộc' });

        let payload;
        try { payload = jwt.verify(refresh_token, REFRESH_SECRET); } catch { /* expired is fine */ payload = jwt.decode(refresh_token); }

        if (payload?.userId) {
            await User.updateOne(
                { _id: payload.userId },
                { $pull: { sessions: { refresh_token } } }
            );
        }
        res.json({ message: 'Đăng xuất thành công' });
    } catch (err) { next(err); }
});

const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─── POST /api/auth/google ───────────────────────────────────────────────────

router.post('/google', async (req, res, next) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Google credential là bắt buộc' });

        if (!GOOGLE_CLIENT_ID) {
            console.error('❌ CRITICAL: GOOGLE_CLIENT_ID is MISSING from environment variables!');
            return res.status(500).json({ error: 'Server hasn\'t configured Google Login yet' });
        }

        console.log('🔍 Attempting Google Auth with ID:', GOOGLE_CLIENT_ID);

        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID
            });
        } catch (verifyErr) {
            console.error('❌ Google Token Verification FAILED:', verifyErr.message);
            return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn: ' + verifyErr.message });
        }

        const payload = ticket.getPayload();
        const { email, name, sub: googleId, picture } = payload;

        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Create new student user
            user = new User({
                email: email.toLowerCase(),
                full_name: name,
                role: 'STUDENT',
                status: 'ACTIVE',
                email_verified: true,
                avatar_key: picture, // store the url as avatar_key for now
                oauth_accounts: [{
                    provider: 'google',
                    provider_id: googleId
                }]
            });
            await user.save();
        } else {
            // Link google account if not exists
            const hasGoogle = user.oauth_accounts.some(oa => oa.provider === 'google');
            if (!hasGoogle) {
                user.oauth_accounts.push({ provider: 'google', provider_id: googleId });
                await user.save();
            }
        }

        if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
            return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
        }

        user.last_login_at = new Date();
        const access_token = signAccess(user);
        const refresh_token = signRefresh(user);

        user.sessions.push({
            refresh_token,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            expires_at: new Date(Date.now() + REFRESH_MS)
        });
        await user.save();

        res.json({
            access_token,
            refresh_token,
            expires_in: ACCESS_EXPIRES,
            user: {
                _id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                avatar_key: user.avatar_key,
                bio: user.bio,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(401).json({ error: 'Xác thực Google thất bại' });
    }
});

// ─── OAuth Placeholders ───────────────────────────────────────────────────────

router.get('/oauth/:provider', (req, res) => {
    const { provider } = req.params;
    if (!['google', 'microsoft'].includes(provider)) {
        return res.status(400).json({ error: 'Provider không hỗ trợ' });
    }
    if (provider === 'google') {
        return res.json({ message: 'Sử dụng endpoint POST /api/auth/google', provider, status: 'implemented' });
    }
    res.json({
        message: `OAuth với ${provider} sẽ được tích hợp trong phiên bản tiếp theo`,
        provider,
        status: 'coming_soon'
    });
});

router.post('/oauth/:provider/callback', (req, res) => {
    res.json({ message: 'OAuth callback placeholder', status: 'coming_soon' });
});

module.exports = router;

