// // useMobile.js

// import { ref, onMounted } from "vue";

// export function useMobile() {
// 	const isMobile = ref(false);

// 	onMounted(() => {
// 		isMobile.value =
// 			/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/i.test(
// 				navigator.userAgent
// 			) ||
// 			(navigator.userAgent.match(/Mac/) &&
// 				navigator.maxTouchPoints &&
// 				navigator.maxTouchPoints > 2);
// 	});

// 	return { isMobile };
// }
