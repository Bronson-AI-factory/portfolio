/**
 * Vercel Serverless API — AI Chat (MiniMax)
 * Скилл: https://github.com/evgyur/cursor-ai-chatbot
 *
 * Переменные окружения на Vercel:
 * - MINIMAX_API_KEY (обязательно)
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_RAW = [
  { q: "Услуги агентства недвижимости", a: "Агентство «Дом и Ключ» предлагает: подбор и показ объектов, сопровождение сделок купли-продажи и аренды, юридическая проверка, ипотечное сопровождение, оценка недвижимости, помощь с переездом." },
  { q: "Цены на услуги", a: "Комиссия при покупке — 2–3% от стоимости объекта. При продаже — 3–5%. Аренда квартир — 50–100% от месячной платы (с одной стороны). Юридическое сопровождение — от 15 000 ₽. Оценка — от 5 000 ₽." },
  { q: "Стоимость услуг", a: "Покупка: 2–3% комиссии. Продажа: 3–5%. Аренда: 50–100% месячной платы. Юрсопровождение: от 15 000 ₽. Оценка: от 5 000 ₽. Консультация: бесплатно." },
  { q: "Покупка квартиры", a: "Комиссия агентства при покупке — 2–3% от стоимости. Включаем подбор объектов по критериям, показы, проверку документов, сопровождение до ключей. Срок — от 2 недель до 2 месяцев в зависимости от региона." },
  { q: "Продажа квартиры", a: "Комиссия при продаже — 3–5%. Услуги: оценка, фото и описание, размещение на площадках, показы, ведение переговоров, сопровождение сделки. Эксклюзив — от 2%." },
  { q: "Аренда квартир", a: "Комиссия: 50–100% месячной платы (обычно с арендатора или арендодателя по договорённости). Подбор, показы, проверка документов, составление договора." },
  { q: "Ипотека", a: "Помощь в подборе банка и программы, сбор документов, сопровождение до одобрения. Услуга входит в пакет при покупке/продаже. Отдельно — от 5 000 ₽." },
  { q: "Юридическая проверка", a: "Проверка прав собственности, обременений, истории сделок. Стоимость — от 15 000 ₽. Входит в пакет при покупке через агентство." },
  { q: "Оценка недвижимости", a: "Оценка для банка, суда или сделки. От 5 000 ₽. Срок — 1–3 рабочих дня. Выдаётся отчёт с обоснованием стоимости." },
  { q: "Контакты CEO", a: "Для связи с CEO Мариной Волковой: email marina.volkova@example.com, Telegram @volkova_ceo. Если нужна личная консультация или срочный вопрос — напишите, и мы переключим вас на CEO." },
  { q: "Связаться с руководством", a: "Чтобы связаться с CEO: marina.volkova@example.com или Telegram @volkova_ceo. Опишите вопрос — я передам или организую обратную связь." }
];

const KNOWLEDGE = KNOWLEDGE_RAW.map(k => `Q: ${k.q}\nA: ${k.a}`).join('\n\n');

const SYSTEM_PROMPT = `Ты — Ассистент CEO. Консультируешь посетителей по услугам агентства недвижимости «Дом и Ключ».

ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе информации ниже
2. Не выдумывай цены или услуги
3. Если информации нет — скажи "Не знаю, уточните у CEO" и предложи контакт: marina.volkova@example.com или Telegram @volkova_ceo
4. Отвечай кратко и по делу
5. Если посетитель просит связаться с CEO — дай контакты: marina.volkova@example.com, @volkova_ceo

Данные:
${KNOWLEDGE}`;

async function callMiniMax(message, apiKey) {
  const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'M2-her',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_completion_tokens: 1024,
      stream: false,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.base_resp?.status_msg || data?.error?.message || `API error ${res.status}`);
  }
  const content = data?.choices?.[0]?.message?.content;
  return content || 'Не удалось получить ответ. Попробуйте позже или напишите CEO: marina.volkova@example.com';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Сервер не настроен. Добавьте MINIMAX_API_KEY в настройках Vercel.',
    });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Нет сообщения' });
  }

  try {
    const response = await callMiniMax(message.trim(), apiKey);
    return res.status(200).json({ response });
  } catch (err) {
    console.error('MiniMax API error:', err.message);
    return res.status(500).json({
      error: err.message || 'Ошибка при обращении к AI. Напишите CEO: marina.volkova@example.com',
    });
  }
};
