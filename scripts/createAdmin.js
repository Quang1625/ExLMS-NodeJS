
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ExLMS'

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password_hash: String,
    full_name: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'INSTRUCTOR', 'STUDENT'], required: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'], required: true },
    email_verified: { type: Boolean, default: false },
    sessions: [{ type: Object }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const User = mongoose.model('User', userSchema)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@exlms.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin'

    ; (async () => {
        await mongoose.connect(MONGODB_URI)
        console.log('✅ Connected to MongoDB')

        const existing = await User.findOne({ email: ADMIN_EMAIL })
        if (existing) {
            // Nếu đã tồn tại, cập nhật role thành ADMIN
            existing.role = 'ADMIN'
            existing.status = 'ACTIVE'
            await existing.save()
            console.log(`✅ Đã cập nhật tài khoản ${ADMIN_EMAIL} thành ADMIN`)
        } else {
            const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
            await User.create({
                email: ADMIN_EMAIL,
                password_hash,
                full_name: ADMIN_NAME,
                role: 'ADMIN',
                status: 'ACTIVE',
                email_verified: true
            })
            console.log(`✅ Tạo tài khoản Admin thành công!`)
        }

        console.log(`\n🔑 Thông tin đăng nhập:`)
        console.log(`   Email   : ${ADMIN_EMAIL}`)
        console.log(`   Password: ${ADMIN_PASSWORD}`)

        await mongoose.connection.close()
        process.exit(0)
    })()
