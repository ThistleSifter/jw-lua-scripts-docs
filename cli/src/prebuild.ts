import path from 'path'

import fs from 'fs-extra'

const DOCS_FOLDER = 'docs'
const DOCS_PUBLISH_PATH = 'src/routes/docs'
const TOC_TEMPLATE_PATH = 'cli/src/templates/toc.svelte'
const DOCS_TEMPLATE_PATH = 'cli/src/templates/docs-page.svelte'
const LAYOUT_TEMPLATE_PATH = 'cli/src/templates/docs-layout.svelte'
const TOC_OUTPUT_PATH = 'src/lib/lib/library-pages.ts'

type LibraryDocumentData = {
    text: string
    href: string
    children?: {
        text: string
        href: string
    }[]
}

const getAllFiles = (folderPath: string, arrayOfFiles?: string[]) => {
    const files = fs.readdirSync(folderPath)

    let output = arrayOfFiles ?? []

    files.forEach(function (file) {
        if (fs.statSync(`${folderPath}/${file}`).isDirectory())
            output = getAllFiles(`${folderPath}/${file}`, output)
        else output.push(path.join(folderPath, '/', file))
    })

    return output
}

const createUrlFromFilePath = (filePath: string): string => {
    return `/${filePath.replace(/_/gu, '-').replace('.md', '')}`
}

const createNameFromFilePath = (filePath: string): string => {
    const splitPath = filePath.split('/')
    const fileName = (splitPath.pop() ?? '').replace('.md', '')
    const name = fileName.replace(/[_-]/gu, ' ')
    const splitName = name.split(' ')
    return splitName.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

const getFolderFromPath = (filePath: string): string => {
    return filePath
        .replace('docs/', '')
        .replace(/\/[\w.-]*$/u, '')
        .replace('.md', '')
}

const getDocsData = (allFiles: string[]): LibraryDocumentData[] => {
    const folders: { [folderName: string]: LibraryDocumentData } = {}
    allFiles.forEach((fullPath) => {
        const href = createUrlFromFilePath(fullPath)
        const text = createNameFromFilePath(fullPath)
        const folderName = getFolderFromPath(fullPath)
        const output = { text, href }

        if (typeof folders[folderName] === 'undefined') {
            folders[folderName] = output
        } else {
            if (typeof folders[folderName].children === 'undefined')
                folders[folderName].children = []
            folders[folderName].children?.push(output)
        }
    })

    return Object.values(folders)
}

const sortDocsPages = (pages: LibraryDocumentData[]): LibraryDocumentData[] => {
    return pages.sort((a, b) => {
        return a.text > b.text ? 1 : -1
    })
}

const creatTableOfContents = (pages: LibraryDocumentData[]) => {
    const contents = `export const libraryPages: any[] = ${JSON.stringify(pages)}`
    fs.writeFileSync(TOC_OUTPUT_PATH, contents)
}

const removePreviousDocs = () => {
    fs.rmdirSync(DOCS_PUBLISH_PATH, { recursive: true })
}

const kabobToSentenceCase = (name: string) => {
    return name
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

const copyDocsFiles = (files: string[]) => {
    const docsTemplateContents = fs.readFileSync(DOCS_TEMPLATE_PATH).toString()
    files.forEach((file) => {
        const contents = fs
            .readFileSync(file)
            .toString()
            .replace(/`/gu, '\\`')
            .replace(/</gu, '&lt;')
            .replace(/>/gu, '&gt;')

        const fileName = file.replace(DOCS_FOLDER, '').replace('.md', '.svelte')
        const outputPath = path.join(DOCS_PUBLISH_PATH, fileName).replace(/_/gu, '-')

        const outputContents = docsTemplateContents
            .replace('MARKDOWN_PLACEHOLDER', contents)
            .replace(
                'TITLE_PLACEHOLDER',
                kabobToSentenceCase(
                    (fileName.split('/').pop() ?? '').replace('.svelte', '').replace('_', '-')
                )
            )

        fs.ensureFileSync(outputPath)

        fs.writeFileSync(outputPath, outputContents)
    })
}

const addLayout = () => {
    fs.copyFileSync(LAYOUT_TEMPLATE_PATH, path.join(DOCS_PUBLISH_PATH, '__layout.svelte'))
}

const createDocsSearch = (allFiles: string[]) => {
    const config: string[] = ['[input]', 'base_directory = "."', 'files = [']

    allFiles.forEach((file) => {
        config.push(
            `    {path = "${file}", url = "${createUrlFromFilePath(
                file
            )}", title = "${createNameFromFilePath(file)}"},`
        )
    })

    config.push(']', '', '[output]', 'filename = "static/stork.st"')

    fs.writeFileSync('config.toml', config.join('\n'))
}

const createLibraryDocs = () => {
    const allFiles = getAllFiles(DOCS_FOLDER).sort()
    let pages = getDocsData(allFiles)
    pages = sortDocsPages(pages)
    creatTableOfContents(pages)
    removePreviousDocs()
    copyDocsFiles(allFiles)
    addLayout()
    createDocsSearch(allFiles)
}

const main = () => {
    createLibraryDocs()
}

main()
