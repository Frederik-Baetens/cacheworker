from locust import FastHttpUser, task

class HelloWorldUser(FastHttpUser):
    concurrency = 50

    @task
    def hello_world(self):
        from gevent.pool import Group
        group = Group()
        for i in range(1,35):
            group.spawn(lambda: self.client.get(f"/dog{i}.jpg"))
        group.join()

