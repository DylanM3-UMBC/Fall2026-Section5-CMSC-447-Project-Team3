import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

export interface TaskDataPoint {
  day: string;
  tasks: number;
}

interface WeeklyTaskChartProps {
  data?: TaskDataPoint[];
  height?: number;
  lineColor?: string;
  pointColor?: string;
}

const DEFAULT_DATA: TaskDataPoint[] = [
  { day: 'Mon', tasks: 4 },
  { day: 'Tue', tasks: 7 },
  { day: 'Wed', tasks: 5 },
  { day: 'Thu', tasks: 10 },
  { day: 'Fri', tasks: 8 },
  { day: 'Sat', tasks: 3 },
  { day: 'Sun', tasks: 6 },
];

export const WeeklyTaskChart: React.FC<WeeklyTaskChartProps> = ({
  data = DEFAULT_DATA,
  height = 220,
  lineColor = '#4F46E5',
  pointColor = '#4F46E5',
}) => {
  // Automatically adapts to the parent container's width
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  // Chart padding
  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = Math.max(containerWidth - paddingLeft - paddingRight, 0);
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate Y-axis scale (rounded up to a clean number)
  const rawMax = Math.max(...data.map((d) => d.tasks), 1);
  const maxTasks = Math.ceil(rawMax / 5) * 5; // Rounds up to nearest multiple of 5
  const yTicks = [0, Math.round(maxTasks / 2), maxTasks];

  // Map data points to (x, y) SVG coordinates
  const points = data.map((item, index) => {
    const x =
      paddingLeft +
      (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y = paddingTop + chartHeight - (item.tasks / maxTasks) * chartHeight;
    return { ...item, x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <Text style={styles.title}>Project Tasks</Text>

      {containerWidth > 0 && (
        <Svg width={containerWidth} height={height}>
          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick) => {
            const y = paddingTop + chartHeight - (tick / maxTasks) * chartHeight;
            return (
              <React.Fragment key={tick}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={containerWidth - paddingRight}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray="4, 4"
                />
                <SvgText
                  x={paddingLeft - 10}
                  y={y + 4}
                  fontSize="11"
                  fill="#6B7280"
                  textAnchor="end"
                >
                  {tick}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* The Data Line */}
          <Polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
          />

          {/* Data Points & X-Axis Labels */}
          {points.map((point, index) => (
            <React.Fragment key={index}>
              {/* Dot on the line */}
              <Circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#FFFFFF"
                stroke={pointColor}
                strokeWidth="2.5"
              />

              {/* Day label on X-Axis */}
              <SvgText
                x={point.x}
                y={height - 8}
                fontSize="12"
                fontWeight="500"
                fill="#374151"
                textAnchor="middle"
              >
                {point.day}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 16,
    marginBottom: 8,
  },
});

export default WeeklyTaskChart;
