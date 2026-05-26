const Sequelize = require('sequelize');
const { Op } = require('sequelize');

/**
 * Kayıtlı kullanıcı: kampanya / teklif / otomatik hatırlatma maillerine dahil olunur mu?
 */
function usersWantCampaignOffersClause() {
    return {
        [Op.or]: [
            { emailConsentOffers: true },
            Sequelize.and(
                { emailConsentOffers: { [Op.is]: null } },
                { marketingConsent: true }
            ),
        ],
    };
}

module.exports = { usersWantCampaignOffersClause };
