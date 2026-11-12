import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import 'nextra-theme-docs/style.css'
import './globals.css'

export const metadata = {
  metadataBase: new URL('https://docs.botpager.reostack.com'),
  title: {
    default: "BotPager CLI Docs",
    template: "%s - BotPager CLI Docs"
  },
  description: "Install, pair, and use BotPager from your terminal or coding agent."
}

const navbar = <Navbar logo={<strong>BotPager <span className="docs-label">CLI docs</span></strong>} projectLink="https://github.com/tolulawson/botpager-cli" />
const footer = <Footer>© Reostack Technologies · <a href="https://botpager.reostack.com/">BotPager</a></Footer>

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase={"https://github.com/tolulawson/botpager-cli/tree/main"}
          editLink="Edit this page"

          sidebar={{ autoCollapse: true, defaultMenuCollapseLevel: 1 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
