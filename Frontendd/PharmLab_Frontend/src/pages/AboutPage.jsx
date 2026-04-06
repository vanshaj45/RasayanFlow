import { useState } from 'react';
import { Github, Linkedin } from 'lucide-react';

const getInitials = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const teamMembers = [
  {
    name: 'Vanshaj Bairagi',
    college: 'SGSITS Indore',
    initials: getInitials('Vanshaj Bairagi'),
    photoPath: '/team/vanshaj-bairagi.jpeg',
    linkedin: 'https://www.linkedin.com/in/vanshaj-bairagi-1190b62b2/',
    github: 'https://github.com/vanshaj45',
  },
  {
    name: 'Pawan Raghuwanshi',
    college: 'SGSITS Indore',
    initials: getInitials('Pawan Raghuwanshi'),
    photoPath: '/team/pawan-raghuwanshi.jpeg',
    linkedin: 'https://www.linkedin.com/in/pawan-raghuwanshi-18275728b/',
    github: 'https://github.com/pawan08bhd',
  },
];

function TeamAvatar({ member }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (hasImageError) {
    return (
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 text-lg font-semibold text-white shadow-sm'>
        {member.initials}
      </div>
    );
  }

  return (
    <img
      src={member.photoPath}
      alt={member.name}
      onError={() => setHasImageError(true)}
      className='h-16 w-16 rounded-full object-cover ring-2 ring-[#556b2f]/20 dark:ring-[#b7cb8e]/30'
      loading='lazy'
    />
  );
}

export default function AboutPage() {
  return (
    <div className='mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8'>
      <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8'>
        <h1 className='text-3xl font-bold tracking-tight text-[#3c4e23] dark:text-[#dce8c5] sm:text-4xl'>
          About RasayanFlow
        </h1>
        <p className='mt-2 text-base text-[#556b2f] dark:text-[#b7cb8e] sm:text-lg'>
          A Pharmacy Lab Inventory Management System
        </p>
        <p className='mt-5 text-sm leading-7 text-gray-700 dark:text-gray-300 sm:text-base'>
          RasayanFlow is a full-stack web application built for the pharmacy department to digitize and streamline
          chemical and equipment inventory management across labs. It supports multiple roles, Super Admin, Lab Admin,
          Store Admin, and Students, each with their own dashboard and permissions. Students can browse labs, borrow
          chemicals, and track their requests in real time. The system features live updates via WebSockets, PubMed
          chemical abstract integration, and a complete audit log of all activity.
        </p>
        <div className='mt-6 h-px w-full bg-gradient-to-r from-[#556b2f]/50 via-gray-300 to-transparent dark:via-gray-700' />
      </section>

      <section className='mt-10'>
        <h2 className='text-2xl font-semibold text-gray-800 dark:text-gray-100'>Meet the Team</h2>
        <div className='mt-5 grid grid-cols-1 gap-5 md:grid-cols-2'>
          {teamMembers.map((member) => (
            <article
              key={member.name}
              className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition duration-300 hover:scale-[1.01] hover:shadow-md dark:border-gray-700 dark:bg-gray-800'
            >
              <div className='flex items-center gap-4'>
                <TeamAvatar member={member} />
                <div>
                  <h3 className='text-xl font-bold text-gray-800 dark:text-gray-100'>{member.name}</h3>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>Student at {member.college}</p>
                </div>
              </div>

              <div className='my-4 h-px w-full bg-gray-200 dark:bg-gray-700' />

              <div className='flex items-center gap-4'>
                <a
                  href={member.linkedin}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-2 text-gray-600 transition hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400'
                  aria-label={`${member.name} LinkedIn`}
                >
                  <Linkedin size={18} />
                  LinkedIn
                </a>
                <a
                  href={member.github}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-2 text-gray-600 transition hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400'
                  aria-label={`${member.name} GitHub`}
                >
                  <Github size={18} />
                  GitHub
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
