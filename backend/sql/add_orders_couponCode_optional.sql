-- Canlı ortamda "Unknown column 'couponCode'" hatasını GARANTİ düzeltmek için tek sefer çalıştırın.
-- Sütun zaten varsa hata verir ("Duplicate column") — işlemi o zaman ATLAYIN.

ALTER TABLE `orders`
    ADD COLUMN `couponCode` VARCHAR(40) NULL;
