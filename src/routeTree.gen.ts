/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AuthenticatedRouteRouteImport } from './routes/_authenticated/route'
import { Route as AuthRouteImport } from './routes/auth'
import { Route as BookRouteImport } from './routes/book'
import { Route as ContactRouteImport } from './routes/contact'
import { Route as GalleryRouteImport } from './routes/gallery'
import { Route as MyBookingRouteImport } from './routes/my-booking'
import { Route as ServicesRouteImport } from './routes/services'
import { Route as AuthenticatedAdminRouteImport } from './routes/_authenticated/admin'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedRouteRoute = AuthenticatedRouteRouteImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthRoute = AuthRouteImport.update({
  id: '/auth',
  path: '/auth',
  getParentRoute: () => rootRouteImport,
} as any)
const BookRoute = BookRouteImport.update({
  id: '/book',
  path: '/book',
  getParentRoute: () => rootRouteImport,
} as any)
const ContactRoute = ContactRouteImport.update({
  id: '/contact',
  path: '/contact',
  getParentRoute: () => rootRouteImport,
} as any)
const GalleryRoute = GalleryRouteImport.update({
  id: '/gallery',
  path: '/gallery',
  getParentRoute: () => rootRouteImport,
} as any)
const MyBookingRoute = MyBookingRouteImport.update({
  id: '/my-booking',
  path: '/my-booking',
  getParentRoute: () => rootRouteImport,
} as any)
const ServicesRoute = ServicesRouteImport.update({
  id: '/services',
  path: '/services',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedAdminRoute = AuthenticatedAdminRouteImport.update({
  id: '/admin',
  path: '/admin',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/auth': typeof AuthRoute
  '/book': typeof BookRoute
  '/contact': typeof ContactRoute
  '/gallery': typeof GalleryRoute
  '/my-booking': typeof MyBookingRoute
  '/services': typeof ServicesRoute
  '/admin': typeof AuthenticatedAdminRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/auth': typeof AuthRoute
  '/book': typeof BookRoute
  '/contact': typeof ContactRoute
  '/gallery': typeof GalleryRoute
  '/my-booking': typeof MyBookingRoute
  '/services': typeof ServicesRoute
  '/admin': typeof AuthenticatedAdminRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/_authenticated': typeof AuthenticatedRouteRouteWithChildren
  '/auth': typeof AuthRoute
  '/book': typeof BookRoute
  '/contact': typeof ContactRoute
  '/gallery': typeof GalleryRoute
  '/my-booking': typeof MyBookingRoute
  '/services': typeof ServicesRoute
  '/_authenticated/admin': typeof AuthenticatedAdminRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/auth'
    | '/book'
    | '/contact'
    | '/gallery'
    | '/my-booking'
    | '/services'
    | '/admin'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/auth'
    | '/book'
    | '/contact'
    | '/gallery'
    | '/my-booking'
    | '/services'
    | '/admin'
  id:
    | '__root__'
    | '/'
    | '/_authenticated'
    | '/auth'
    | '/book'
    | '/contact'
    | '/gallery'
    | '/my-booking'
    | '/services'
    | '/_authenticated/admin'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AuthenticatedRouteRoute: typeof AuthenticatedRouteRouteWithChildren
  AuthRoute: typeof AuthRoute
  BookRoute: typeof BookRoute
  ContactRoute: typeof ContactRoute
  GalleryRoute: typeof GalleryRoute
  MyBookingRoute: typeof MyBookingRoute
  ServicesRoute: typeof ServicesRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedRouteRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/auth': {
      id: '/auth'
      path: '/auth'
      fullPath: '/auth'
      preLoaderRoute: typeof AuthRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/book': {
      id: '/book'
      path: '/book'
      fullPath: '/book'
      preLoaderRoute: typeof BookRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/contact': {
      id: '/contact'
      path: '/contact'
      fullPath: '/contact'
      preLoaderRoute: typeof ContactRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/gallery': {
      id: '/gallery'
      path: '/gallery'
      fullPath: '/gallery'
      preLoaderRoute: typeof GalleryRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/my-booking': {
      id: '/my-booking'
      path: '/my-booking'
      fullPath: '/my-booking'
      preLoaderRoute: typeof MyBookingRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/services': {
      id: '/services'
      path: '/services'
      fullPath: '/services'
      preLoaderRoute: typeof ServicesRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated/admin': {
      id: '/_authenticated/admin'
      path: '/admin'
      fullPath: '/admin'
      preLoaderRoute: typeof AuthenticatedAdminRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
  }
}

interface AuthenticatedRouteRouteChildren {
  AuthenticatedAdminRoute: typeof AuthenticatedAdminRoute
}

const AuthenticatedRouteRouteChildren: AuthenticatedRouteRouteChildren = {
  AuthenticatedAdminRoute: AuthenticatedAdminRoute,
}

const AuthenticatedRouteRouteWithChildren =
  AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
  AuthRoute: AuthRoute,
  BookRoute: BookRoute,
  ContactRoute: ContactRoute,
  GalleryRoute: GalleryRoute,
  MyBookingRoute: MyBookingRoute,
  ServicesRoute: ServicesRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
