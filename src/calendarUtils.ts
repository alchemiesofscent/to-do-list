import { AcademicTask } from './types.ts';

const isValidDateString = (value: string) => !Number.isNaN(new Date(value).getTime());

export const generateGoogleCalendarUrl = (task: AcademicTask) => {
  if (!task.deadline || !isValidDateString(task.deadline)) return null;
  const date = new Date(task.deadline).toISOString().replace(/-|:|\.\d\d\d/g, "");
  const details = encodeURIComponent(`${task.description}\n\nStatus: ${task.status}\nType: ${task.type}`);
  const title = encodeURIComponent(`DEADLINE: ${task.title}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`;
};

export const downloadIcsFile = (task: AcademicTask) => {
  if (!task.deadline || !isValidDateString(task.deadline)) return;
  
  const dateStr = new Date(task.deadline).toISOString().replace(/-|:|\.\d\d\d/g, "");
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${dateStr}`,
    `DTEND:${dateStr}`,
    `SUMMARY:${task.title}`,
    `DESCRIPTION:${task.description.replace(/\n/g, "\\n")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${task.title.substring(0, 20)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
