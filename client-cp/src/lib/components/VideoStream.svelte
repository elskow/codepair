<script lang="ts">
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	export let stream: Writable<MediaStream | null>;
	export let muted: boolean = false;
	export let title: string = '';

	let videoElement: HTMLVideoElement;

	onMount(() => {
		const unsubscribe = stream.subscribe((value) => {
			videoElement.srcObject = value;
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<video bind:this={videoElement} {muted} autoplay playsinline {title}></video>

<style>
	video {
		width: 300px;
		height: 200px;
		margin: 10px;
		background-color: #ddd;
	}
</style>
