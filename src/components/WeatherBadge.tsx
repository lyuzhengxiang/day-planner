interface WeatherBadgeProps {
  weather: string;
}

export default function WeatherBadge({ weather }: WeatherBadgeProps) {
  return <span className="text-gray-500 text-xs">Chicago {weather}</span>;
}
