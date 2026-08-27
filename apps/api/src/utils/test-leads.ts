export async function runTest() {
  console.log('🚀 Початок автоматичного тестування...')
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:5678'

  for (let i = 1; i <= 3; i++) {
    const res = await fetch(`${apiBaseUrl}/api/leads/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Тестовий Юзер ${i}`,
        phone: `+38000000000${i}`,
        services: ['Тестування системи'],
        district: 'Центр',
      }),
    })
    console.log(`Заявка №${i}: Статус ${res.status}`)
  }
}

await runTest()
