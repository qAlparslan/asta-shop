const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- 1. KAPI KONTROLÜ (Giriş Yapılmış mı?) ---
exports.protect = async (req, res, next) => {
    try {
        // 1. İstek (Request) ile birlikte bilet (Token) gelmiş mi?
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1]; // "Bearer asdasd123..." içinden sadece token kısmını alır
        }

        if (!token) {
            return res.status(401).json({ 
                status: 'fail', 
                message: 'Bu işlemi yapmak için giriş yapmalısınız! Lütfen biletinizi (Token) gösterin.' 
            });
        }

        // 2. Bilet sahte mi veya süresi (1 gün) dolmuş mu?
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Bilet gerçek ama kullanıcı hesabını silmiş olabilir mi?
        const currentUser = await User.findByPk(decoded.id);
        if (!currentUser) {
            return res.status(401).json({ 
                status: 'fail', 
                message: 'Bu bilete ait kullanıcı artık sistemde mevcut değil.' 
            });
        }

        if (Object.prototype.hasOwnProperty.call(decoded, 'role') && decoded.role !== currentUser.role) {
            return res.status(401).json({
                status: 'fail',
                message: 'Hesap bilgileriniz güncellendi. Lütfen tekrar giriş yapın.',
            });
        }

        // VİP GEÇİŞ BAŞARILI! 
        // Kullanıcı bilgilerini 'req' nesnesinin içine koyuyoruz ki bir sonraki aşamada (Ürün Ekleme) "Bunu kim ekledi?" diye sorabilelim.
        req.user = currentUser;
        next(); // Güvenlikten geçti, asıl işleme devam edebilir!

    } catch (err) {
        return res.status(401).json({ 
            status: 'fail', 
            message: 'Geçersiz veya süresi dolmuş bilet. Lütfen tekrar giriş yapın.' 
        });
    }
};

// --- 2. YETKİ KONTROLÜ (Bu kişi Admin mi?) ---
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // 'req.user' bilgisi yukarıdaki protect fonksiyonundan geldi.
        // Eğer roller dizisi ('admin') içinde kullanıcının rolü ('customer') yoksa hata ver!
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                status: 'fail', 
                message: 'Dur! Bu işlemi gerçekleştirmek için yetkiniz (Admin) bulunmuyor.' 
            });
        }
        
        next(); // Yetkisi var, işleme devam!
    };
};

/**
 * Bearer token varsa doğrular ve req.user doldurur; yoksa veya geçersizse 401 dönmeden devam eder.
 * Sipariş oluşturma gibi herkese açık uçlarda hesabı siparişe bağlamak için kullanılır.
 */
exports.optionalProtect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findByPk(decoded.id);
        if (!currentUser) {
            return next();
        }
        if (Object.prototype.hasOwnProperty.call(decoded, 'role') && decoded.role !== currentUser.role) {
            return next();
        }
        req.user = currentUser;
        next();
    } catch {
        next();
    }
};