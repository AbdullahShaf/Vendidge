'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
    Wallet, Users, FileText, Settings, HelpCircle,
    ChevronLeft, ChevronRight, X
} from 'lucide-react';

export default function Sidebar({ darkMode, sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen }) {

    const pathname = usePathname();

    const menuItems = [
        { icon: Wallet, label: 'Dashboard', url: '/dashboard' },
        { icon: Users, label: 'Customer', url: '/customer' },
        { icon: FileText, label: 'Invoice', url: '/invoice' },
    ];

    const bottomItems = [
        { icon: Settings, label: 'Settings', url: '/setting' },
        { icon: HelpCircle, label: 'Help', url: '/help' },
    ];


    return (
        <>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 h-full transition-all duration-300 
        ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-800' : 'border-gray-200'}
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} flex items-center justify-between py-4 px-5 border-b border-gray-200 dark:border-gray-700`}>
                    <div className="flex-1 flex justify-start lg:justify-center">
                        <Link href="/dashboard">
                            <Image
                                src={darkMode ? "/images/login/logos.png" : "/images/sidebar/sidebarlogo.png"}
                                alt="Logo"
                                width={521}
                                height={421}
                                className="w-20 h-10 lg:w-225 lg:h-13 object-contain"
                            />
                        </Link>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="p-4 space-y-1 flex-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.url}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${pathname === item.url
                                ? 'bg-blue-600 text-white'
                                : darkMode
                                    ? 'hover:bg-gray-800'
                                    : 'hover:bg-gray-100'
                                }`}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {bottomItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.url}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${pathname === item.url
                                ? 'bg-blue-600 text-white'
                                : darkMode
                                    ? 'hover:bg-gray-800'
                                    : 'hover:bg-gray-100'
                                }`}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                        </Link>
                    ))}


                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-lg transition ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                            }`}
                    >
                        {sidebarCollapsed ? (
                            <ChevronRight className="w-5 h-5 shrink-0" />
                        ) : (
                            <ChevronLeft className="w-5 h-5 shrink-0" />
                        )}
                        {!sidebarCollapsed && <span>Collapse</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}