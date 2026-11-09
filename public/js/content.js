// Source (MIT): https://github.com/Glebsolopdf/avv-card
// Ссылки и запасные данные. Тарифы и страны серверов в рабочем режиме приходят из data.json,
// который обновляет refresh.mjs (бэкенд сайта) по данным клиентского API; браузер к Core не обращается.
// Блок fallback показывается, только пока data.json недоступен.
window.SITE = {
  cabinetUrl: 'https://my.substituteme.space/',
  botUrl: 'https://t.me/antivibecodingvpnbot', // бот покупателей; пусто — кнопки бота ведут к блоку с тарифами
  popularKey: 'plus', // ключ тарифа, который отмечается как «Самый популярный» (в API такого признака нет)
  refreshMinutes: 10, // как часто открытая страница сама подтягивает data.json
  fallback: {
    sample: true,
    tariffs: [
      { key: 'start', name: 'Старт', price_stars: 100, duration_days: 30, quotas: [{ type: 'periodic', reset_mode: 'dynamic', limit_bytes: 214748364800, period_minutes: 43200 }] },
      { key: 'standard', name: 'Стандарт', price_stars: 250, duration_days: 90, quotas: [{ type: 'periodic', reset_mode: 'static', limit_bytes: 1099511627776, period_months: 1 }] },
      { key: 'year', name: 'Год', price_stars: 900, duration_days: 365, quotas: [{ type: 'lifetime', limit_bytes: 5497558138880 }] },
    ],
    countries: ['de', 'fi'],
  },
};
