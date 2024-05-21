import {Messages} from "&/modules/messages";

Messages.recv("offscreen", {
	"Alert": async (data) => {
		alert(data);
	}
});