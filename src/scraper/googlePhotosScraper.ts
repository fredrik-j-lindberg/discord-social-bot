import { chromium } from "playwright"

export interface Photo {
  uploadDate: Date
  url: string
}

export const fetchRecentPhotos = async ({
  albumUrl,
  cutoffDate,
}: {
  albumUrl: string
  /** Photos after this date are returned */
  cutoffDate: Date
}): Promise<Photo[]> => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Log page console (for debugging)
  page.on("console", (msg) => {
    console.log("PAGE LOG:", msg.text())
  })

  await page.goto(albumUrl, { waitUntil: "networkidle" })

  console.log("Successfully went to url")

  /** The elements we are looking for */
  const selector = "a[aria-label]"
  await page
    .waitForSelector(selector, { timeout: 15000 })
    .catch(async (err: unknown) => {
      console.error("Could not find the expected photo elements.", err)
      await browser.close()
      throw new Error("Failed to load photo elements.")
    })
  console.log("Relevant elements are loaded.")

  // Screenshot for debugging
  await page.screenshot({ path: "loaded_playwright.png", fullPage: true })
  console.log("Saved screenshot.")

  // Extract images posted within the last 30 days
  const recentPhotos = await page.evaluate(
    ({ cutoffTimestamp, selector }) => {
      const elements = document.querySelectorAll(selector)

      const photos: Photo[] = []
      elements.forEach((el) => {
        const ariaLabel = el.getAttribute("aria-label")

        const styleEl = el.querySelector('div[style*="background-image"]') // Selecting a child with style similar to: opacity: 1; background-image: url(&quot;https://lh3.googleusercontent.com/pw/AP1GczOFPlUnMHT1cWnVnz3snXs8Qqlhc_b7UXU1chiLNvgKeLlR-tKYgFPWJEfNsIeSD4e0TA405QRPbAAWRHf3Ksg1Cpd8Kq_f--6RGJj9TDADFVts-JESifuBEay81zooYXRnaGaBaASvKTsS43bThb9CIhNPuQONpGhNqYsN6TuEyt9yHdqgyp0CrcuTO9MtorErSAL2UjaDHA8irM15jLxPigx8pG0NxXJ9ScwhE4UWkXv1srSXo4_pFUZBWbNp-6j3Qb4_nU07Tp_U4SOWslKcrnPI3tqS6qBnxUGRtCeps1KUUqOAcKn8CpYo-MBfKYrXhbFNRnkUJ2Ma3R8fluMXHURapitU0nDLypr3ToUyGJ11jmO99NQ5xu8uXBLLIl7eLwADAMgxnTD46EwKNgKHu2yMAFAiL_Tgc6lDsKuIqViBGcdArDWjIBlKJQFRdPH18DdNjh7KlmPgWFZ_S5JXNTFGysP24LNpDqolf-cRdnZWAl-tJ0BL5PQzt4TdNrV7y-coSrbOxfukTyP2WQFdRp4xZe5cZT9YYzFZrlLgqqshb6ZPPpu-VL_4kxWsW-E_q85hKq6qWRPEtSSrE0piXYh9T_mvvj4ZBON8anPSI2IVLCfaV9StiJu17_0bB_UyrhKKhkThNB8GuYHxJ90qtfdA8BKGSi-PZgbCuJAAbex-DZmMIF9f7KvcNBgqwZCWV7CIvpLzZgEzrV3t3DPTL-Yh5sM2qpftfOM3eX9fc8Asa7BLf0MZBpc3Dybs6wHmqajP7atGbWn2wz6m2F55I77vIB16n6Dl1sIiZXUjUgcpN9Xp8EVRUnJH4eZO-OAWGbfnn9_lxUHhj0gUkWjkG1_x01nduD9faNnou15hozfjeJJmqPxusXNq-UAvOUkSwwUumWXlNVDiKUZ46Q0wrK_2iBkFA_xk6YfRnF31k-obEWNSI1dRvUk=w277-h208-no?authuser=0&quot;), url(&quot;https://lh3.googleusercontent.com/pw/AP1GczOFPlUnMHT1cWnVnz3snXs8Qqlhc_b7UXU1chiLNvgKeLlR-tKYgFPWJEfNsIeSD4e0TA405QRPbAAWRHf3Ksg1Cpd8Kq_f--6RGJj9TDADFVts-JESifuBEay81zooYXRnaGaBaASvKTsS43bThb9CIhNPuQONpGhNqYsN6TuEyt9yHdqgyp0CrcuTO9MtorErSAL2UjaDHA8irM15jLxPigx8pG0NxXJ9ScwhE4UWkXv1srSXo4_pFUZBWbNp-6j3Qb4_nU07Tp_U4SOWslKcrnPI3tqS6qBnxUGRtCeps1KUUqOAcKn8CpYo-MBfKYrXhbFNRnkUJ2Ma3R8fluMXHURapitU0nDLypr3ToUyGJ11jmO99NQ5xu8uXBLLIl7eLwADAMgxnTD46EwKNgKHu2yMAFAiL_Tgc6lDsKuIqViBGcdArDWjIBlKJQFRdPH18DdNjh7KlmPgWFZ_S5JXNTFGysP24LNpDqolf-cRdnZWAl-tJ0BL5PQzt4TdNrV7y-coSrbOxfukTyP2WQFdRp4xZe5cZT9YYzFZrlLgqqshb6ZPPpu-VL_4kxWsW-E_q85hKq6qWRPEtSSrE0piXYh9T_mvvj4ZBON8anPSI2IVLCfaV9StiJu17_0bB_UyrhKKhkThNB8GuYHxJ90qtfdA8BKGSi-PZgbCuJAAbex-DZmMIF9f7KvcNBgqwZCWV7CIvpLzZgEzrV3t3DPTL-Yh5sM2qpftfOM3eX9fc8Asa7BLf0MZBpc3Dybs6wHmqajP7atGbWn2wz6m2F55I77vIB16n6Dl1sIiZXUjUgcpN9Xp8EVRUnJH4eZO-OAWGbfnn9_lxUHhj0gUkWjkG1_x01nduD9faNnou15hozfjeJJmqPxusXNq-UAvOUkSwwUumWXlNVDiKUZ46Q0wrK_2iBkFA_xk6YfRnF31k-obDWNSI1dRvUk=w406-h304-no?authuser=0&quot;);
        const style = styleEl?.getAttribute("style") || ""

        if (!ariaLabel || !style) {
          return // Could not find the relevant properties, ignoring the element as irrelevant
        }

        const regex =
          /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}, \s*\d{1,2}:\d{2}:\d{2}\s*[AP]M/

        const dateMatch = regex.exec(ariaLabel)
        if (!dateMatch) {
          console.info(
            "Found an aria label a tag but it did not contain a date in the aria label. Ignoring it",
          )
          return
        }

        const dateStr = dateMatch[0] // E.g. Jul 26, 2025, 1:15:40 PM
        const uploadDate = new Date(dateStr)
        if (isNaN(uploadDate.getTime())) {
          console.warn(
            `Found a photo with date match (${dateStr}), but was unable to convert it to a valid date`,
          )
          return
        }

        if (uploadDate.getTime() < cutoffTimestamp) {
          console.info(
            `Found a photo with a valid date, but its upload date (${uploadDate.toISOString()}) was prior to the cutoff date (${new Date(cutoffTimestamp).toISOString()}). Ignoring it.`,
          )
          return
        }

        const urlRegex = /background-image:\s*url\(["'](.+?)["']\)/
        const urlMatch = urlRegex.exec(style)
        const photoUrl = urlMatch?.[1] // E.g. https://lh3.googleusercontent.com/pw/AP1GczPDREW6wLXmCj0RBNFOdOAOfve9EzRGBhSIgNTUSRfUaKxtr8BJ8fh-Awr00_ZGaDWr1CJl1aFD2v3af3WQPFG0AkQiGGTIxe74uvkVVhNwsNmhVRZ8=w368-h275-no
        if (!photoUrl) {
          console.error(
            "Found a photo within the time window, but failed to extract its URL",
          )
          return
        }

        photos.push({ uploadDate: uploadDate, url: photoUrl })
      })
      return photos
    },
    { cutoffTimestamp: cutoffDate.getTime(), selector },
  )

  await browser.close()
  return recentPhotos
}
