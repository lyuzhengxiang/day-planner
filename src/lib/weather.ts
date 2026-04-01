export async function fetchWeather(): Promise<string> {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=Chicago&aqi=no`
    );

    if (!res.ok) return "Weather unavailable";

    const data = await res.json();
    const { temp_f, condition } = data.current;
    return `${Math.round(temp_f)}\u00b0F, ${condition.text}`;
  } catch {
    return "Weather unavailable";
  }
}
