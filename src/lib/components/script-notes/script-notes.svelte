<script lang="ts">
    import CodeBlock from './code-block.svelte'
    import Leaf from './leaf.svelte'

    export let notes: string

    type Block =
        | {
              type: 'p' | 'code'
              content: string
          }
        | {
              type: 'ol' | 'ul'
              content: string[]
          }

    type Content = Block[]

    let content: Content = []
    $: {
        const lines = notes.split('\n\n')
        content = lines.map((line) => {
            if (line.startsWith('```') && line.endsWith('```')) {
                return {
                    type: 'code',
                    content: line.slice(3, -3).trim(),
                }
            } else if (line.startsWith('1)') || line.startsWith('1.')) {
                return {
                    type: 'ol',
                    content: line.split('\n').map((l) => {
                        const matches = l.match(/\d+[\.\)] *(.*)/)
                        return matches?.[1] ?? l
                    }),
                }
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                return {
                    type: 'ul',
                    content: line.split('\n').map((l) => {
                        const matches = l.match(/[-\*] *(.*)/)
                        return matches?.[1] ?? l
                    }),
                }
            } else {
                return {
                    type: 'p',
                    content: line,
                }
            }
        })
    }
</script>

<div class="my-3 flex flex-col space-y-2">
    {#each content as block}
        {#if block.type == 'p'}
            <p>
                <Leaf text="{block.content}" />
            </p>
        {:else if block.type == 'ul'}
            <ul class="list-disc pl-8">
                {#each block.content as item}
                    <li><Leaf text="{item}" /></li>
                {/each}
            </ul>
        {:else if block.type == 'ol'}
            <ol class="list-decimal pl-8">
                {#each block.content as item}
                    <li><Leaf text="{item}" /></li>
                {/each}
            </ol>
        {:else if block.type == 'code'}
            <CodeBlock>
                {block.content}
            </CodeBlock>
        {/if}
    {/each}
</div>
