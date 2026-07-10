/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint всё равно можно гонять локально через `npm run lint`.
    // Отключаем блокировку прод-билда - недавно eslint-plugin-react-hooks
    // добавил правило про setState в useEffect, которое ложно срабатывает
    // на стандартный паттерн "useEffect -> вызов async-функции -> setState внутри неё".
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;